/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { waitFor, within } from '@testing-library/react';
import { map } from 'lodash';
import { http, HttpResponse } from 'msw';

import { SearchView } from './SearchView';
import { ACTION_IDS } from '../../constants';
import server from '../../mocks/server';
import { searchParamsVar } from '../apollo/searchVar';
import { DOCS_SERVICE_NAME, HEALTH_PATH, INTERNAL_PATH, REST_ENDPOINT, ROOTS } from '../constants';
import {
	ACTION_REGEXP,
	COLORS,
	DISPLAYER_EMPTY_MESSAGE,
	ICON_REGEXP,
	SELECTORS
} from '../constants/test';
import BaseNodeFragmentDoc from '../graphql/fragments/baseNode.graphql';
import { healthCache } from '../hooks/useHealthInfo';
import { HealthResponse } from '../mocks/handleHealthRequest';
import {
	populateFile,
	populateFolder,
	populateNodes,
	populateParents,
	populatePermissions,
	populateShares
} from '../mocks/mockUtils';
import {
	buildBreadCrumbRegExp,
	buildChipsFromKeywords,
	moveNode,
	screen,
	setup,
	spyOnUseCreateOptions
} from '../tests/utils';
import { AdvancedFilters } from '../types/common';
import { Resolvers } from '../types/graphql/resolvers-types';
import { BaseNodeFragment, Folder, NodeType } from '../types/graphql/types';
import {
	mockDeleteShares,
	mockFindNodes,
	mockGetNode,
	mockGetCollaborationLinks,
	mockGetLinks,
	mockGetPath,
	mockMoveNodes,
	mockRestoreNodes,
	mockTrashNodes
} from '../utils/resolverMocks';
import { getChipLabel } from '../utils/utils';

vi.mock('./components/VirtualizedNodeListItem');

describe('Search view', () => {
	describe('Shared by me param', () => {
		it('should not remove the node from the list and keep the displayer opened if the user remove all the collaborators', async () => {
			const searchParams: AdvancedFilters = { sharedByMe: { label: 'shared', value: true } };
			searchParamsVar(searchParams);
			const nodes = populateNodes(2);
			const nodeWithShares = populateFile();
			const shares = populateShares(nodeWithShares, 1, true);
			nodeWithShares.shares = shares;
			nodeWithShares.permissions.can_share = true;
			nodes.push(nodeWithShares);
			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes),
					getNode: mockGetNode({ getNode: [nodeWithShares], getShares: [nodeWithShares] }),
					getLinks: mockGetLinks(nodeWithShares.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				},
				Mutation: {
					deleteShares: mockDeleteShares([shares[0]!.share_target!.id])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<SearchView />, {
				initialRouterEntries: [`/${INTERNAL_PATH.SEARCH}/?node=${nodeWithShares.id}&tab=sharing`],
				mocks
			});

			expect(await screen.findByText(nodes[0].name)).toBeVisible();
			// render the collaborator
			expect(screen.getByText(getChipLabel(shares[0].share_target))).toBeVisible();
			// remove the collaborator
			await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.trash }));
			await user.click(screen.getByRole('button', { name: /remove/i }));
			expect(screen.queryByTestId(SELECTORS.chip)).not.toBeInTheDocument();
			// the node is kept in the main list, but the share icon is removed
			const nodeItem = screen.getByTestId(SELECTORS.nodeItem(nodeWithShares.id));
			expect(within(nodeItem).getByText(nodeWithShares.name)).toBeVisible();
			expect(within(nodeItem).queryByTestId(ICON_REGEXP.sharedByMe)).not.toBeInTheDocument();
			// the displayer remains opened
			expect(
				within(screen.getByTestId(SELECTORS.displayer)).getByText(nodeWithShares.name)
			).toBeVisible();
			expect(screen.getByText(/sharing/i)).toBeVisible();
			expect(screen.getByText(/collaborators/i)).toBeVisible();
		});
	});

	describe('Displayer', () => {
		test('Single click on a node opens the details tab on displayer. Close displayer action keeps search view visible', async () => {
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
			searchParamsVar(searchParams);
			const currentSearch = populateNodes(2);
			const mocks = {
				Query: {
					findNodes: mockFindNodes(currentSearch),
					getNode: mockGetNode({ getNode: [currentSearch[0]] })
				}
			} satisfies Partial<Resolvers>;

			const { getByTextWithMarkup, user } = setup(<SearchView />, {
				initialRouterEntries: [`/${INTERNAL_PATH.SEARCH}`],
				mocks
			});
			expect(screen.queryByText('Previous view')).not.toBeInTheDocument();
			const nodeItem = await screen.findByText(currentSearch[0].name);
			expect(nodeItem).toBeVisible();
			const displayer = screen.getByTestId(SELECTORS.displayer);
			expect(within(displayer).queryByText(/details/i)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(within(displayer).getAllByText(currentSearch[0].name)).toHaveLength(2);
			expect(getByTextWithMarkup(buildBreadCrumbRegExp(currentSearch[0].name))).toBeVisible();
			const closeDisplayerAction = within(
				screen.getByTestId(SELECTORS.displayerHeader)
			).getByTestId(ICON_REGEXP.close);
			expect(closeDisplayerAction).toBeVisible();
			await user.click(closeDisplayerAction);
			expect(within(displayer).queryByText(/details/i)).not.toBeInTheDocument();
			expect(screen.getByText(currentSearch[0].name)).toBeVisible();
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
		});

		test('Move action does not close the displayer if node is not removed from the main list', async () => {
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
			searchParamsVar(searchParams);

			const nodes = populateNodes(2);
			const node = nodes[0];
			node.parent = populateFolder();
			const { path: parentPath } = populateParents(node.parent);
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			(node.parent as Folder).children.nodes.push(destinationFolder);
			(node.parent as Folder).permissions.can_write_folder = true;
			(node.parent as Folder).permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.flagged = true;
			const path = [...parentPath, node];
			const pathUpdated = [...parentPath, destinationFolder, node];
			const pathResponse = [path, pathUpdated];

			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes),
					getNode: mockGetNode({
						getNode: [node, node.parent, destinationFolder],
						getChildren: [node.parent]
					}),
					getPath: mockGetPath(...pathResponse, parentPath, [...parentPath, destinationFolder])
				},
				Mutation: {
					moveNodes: mockMoveNodes([node])
				}
			} satisfies Partial<Resolvers>;

			const { getByTextWithMarkup, queryByTextWithMarkup, findByTextWithMarkup, user } = setup(
				<SearchView />,
				{
					initialRouterEntries: [`/${INTERNAL_PATH.SEARCH}`],
					mocks
				}
			);

			// wait the content to be rendered
			await screen.findAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(nodes).not.toBeNull();
			expect(nodes.length).toBeGreaterThan(0);
			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId(SELECTORS.displayer);
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			expect(getByTextWithMarkup(buildBreadCrumbRegExp(node.name))).toBeVisible();
			const showPathButton = screen.getByRole('button', { name: /show path/i });
			expect(showPathButton).toBeVisible();
			await user.click(showPathButton);
			const fullPathOrig = await findByTextWithMarkup(
				buildBreadCrumbRegExp(...map(path, (parent) => parent.name))
			);
			expect(fullPathOrig).toBeVisible();
			// right click to open contextual menu
			const nodeToMoveItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
			await user.rightClick(nodeToMoveItem);
			await moveNode(destinationFolder, user);
			vi.advanceTimersToNextTimer();
			const fullPath = await findByTextWithMarkup(
				buildBreadCrumbRegExp(...map(pathUpdated, (parent) => parent.name))
			);
			await screen.findByText(/item moved/i);
			// old breadcrumb is not visible anymore
			expect(
				queryByTextWithMarkup(buildBreadCrumbRegExp(...map([...path], (parent) => parent.name)))
			).not.toBeInTheDocument();
			// updated breadcrumb is visible instead
			expect(fullPath).toBeVisible();
			expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				nodes.length
			);
			expect(within(screen.getByTestId(SELECTORS.list())).getByText(node.name)).toBeVisible();
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
		});

		test('Mark for deletion does not close the displayer from searches without trashed nodes', async () => {
			const keywords = ['keyword1', 'keyword2'];
			const folder = populateFolder();
			const searchParams: AdvancedFilters = {
				keywords: buildChipsFromKeywords(keywords),
				folderId: { label: folder.name, value: folder.id },
				cascade: { value: true }
			};
			searchParamsVar(searchParams);

			const nodes = populateNodes(2);
			const node = nodes[0];
			node.parent = populateFolder();
			node.parent.permissions.can_write_folder = true;
			node.parent.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.permissions.can_delete = true;

			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes),
					getNode: mockGetNode({ getNode: [node, node.parent] })
				},
				Mutation: {
					trashNodes: mockTrashNodes([node.id])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<SearchView />, {
				initialRouterEntries: [`/${INTERNAL_PATH.SEARCH}`],
				mocks
			});

			// wait the content to be rendered
			await screen.findAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(nodes).not.toBeNull();
			expect(nodes.length).toBeGreaterThan(0);
			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId(SELECTORS.displayer);
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			// right click to open contextual menu
			const nodeToTrashItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
			await user.rightClick(nodeToTrashItem);
			const moveToTrashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(moveToTrashAction).toBeVisible();
			await user.click(moveToTrashAction);
			// await snackbar to be shown
			await screen.findByText(/item moved to trash/i);
			expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				nodes.length
			);
			expect(within(screen.getByTestId(SELECTORS.list())).getByText(node.name)).toBeVisible();
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			const trashedNodeItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
			expect(trashedNodeItem).toBeVisible();
			await user.rightClick(trashedNodeItem);
			await screen.findByText(ACTION_REGEXP.restore);
			expect(screen.getByText(ACTION_REGEXP.restore)).toBeVisible();
			expect(screen.getByText(ACTION_REGEXP.deletePermanently)).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
		});

		test('Mark for deletion does not close the displayer from searches with nodes both marked for deletion and not', async () => {
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
			searchParamsVar(searchParams);

			const nodes = populateNodes(2);
			const node = nodes[0];
			node.parent = populateFolder();
			node.parent.permissions.can_write_folder = true;
			node.parent.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.permissions.can_delete = true;

			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes),
					getNode: mockGetNode({ getNode: [node, node.parent] })
				},
				Mutation: {
					trashNodes: mockTrashNodes([node.id])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<SearchView />, {
				initialRouterEntries: [`/${INTERNAL_PATH.SEARCH}`],
				mocks
			});

			// wait the content to be rendered
			await screen.findAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(nodes).not.toBeNull();
			expect(nodes.length).toBeGreaterThan(0);
			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId(SELECTORS.displayer);
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			// right click to open contextual menu
			const nodeToTrashItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
			await user.rightClick(nodeToTrashItem);
			const moveToTrashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(moveToTrashAction).toBeVisible();
			await user.click(moveToTrashAction);
			// await snackbar to be shown
			await screen.findByText(/item moved to trash/i);
			expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				nodes.length
			);
			expect(within(screen.getByTestId(SELECTORS.list())).getByText(node.name)).toBeVisible();
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			const trashedNodeItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
			expect(trashedNodeItem).toBeVisible();
			await user.rightClick(trashedNodeItem);
			await screen.findByText(ACTION_REGEXP.restore);
			expect(screen.getByText(ACTION_REGEXP.restore)).toBeVisible();
			expect(screen.getByText(ACTION_REGEXP.deletePermanently)).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
		});

		test('Restore does not close the displayer from searches with only trashed nodes', async () => {
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = {
				keywords: buildChipsFromKeywords(keywords),
				folderId: { label: 'Trash', value: ROOTS.TRASH }
			};
			searchParamsVar(searchParams);

			const nodes = populateNodes(2);
			const node = nodes[0];
			node.parent = populateFolder();
			node.parent.permissions.can_write_folder = true;
			node.parent.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.rootId = ROOTS.TRASH;

			global.apolloClient.writeFragment<BaseNodeFragment>({
				fragment: BaseNodeFragmentDoc,
				fragmentName: 'BaseNode',
				data: {
					__typename: 'Folder',
					id: ROOTS.LOCAL_ROOT,
					name: ROOTS.LOCAL_ROOT,
					type: NodeType.Root,
					rootId: null,
					flagged: false,
					permissions: populatePermissions(true)
				}
			});

			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes),
					getNode: mockGetNode({ getNode: [node, node.parent] })
				},
				Mutation: {
					restoreNodes: mockRestoreNodes([{ ...node, rootId: ROOTS.LOCAL_ROOT }])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<SearchView />, {
				initialRouterEntries: [`/${INTERNAL_PATH.SEARCH}`],
				mocks
			});

			// wait the content to be rendered
			await screen.findAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(nodes).not.toBeNull();
			expect(nodes.length).toBeGreaterThan(0);
			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId(SELECTORS.displayer);
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			// right click to open contextual menu
			const nodeToRestoreItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
			await user.rightClick(nodeToRestoreItem);
			const restoreAction = await screen.findByText(ACTION_REGEXP.restore);
			expect(restoreAction).toBeVisible();
			expect(restoreAction).toHaveStyle({
				color: COLORS.text.regular
			});
			await user.click(restoreAction);
			// await snackbar to be shown
			await screen.findByText(/^success$/i);
			expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				nodes.length
			);
			expect(within(screen.getByTestId(SELECTORS.list())).getByText(node.name)).toBeVisible();
			expect(within(screen.getByTestId(SELECTORS.displayer)).getAllByText(node.name)).toHaveLength(
				2
			);
			const restoredNodeItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
			expect(restoredNodeItem).toBeVisible();
			await user.rightClick(restoredNodeItem);
			await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(screen.getByText(ACTION_REGEXP.moveToTrash)).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.deletePermanently)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.restore)).not.toBeInTheDocument();
		});

		test('Restore does not close the displayer from searches with nodes both marked for deletion and not', async () => {
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
			searchParamsVar(searchParams);

			const nodes = populateNodes(2);
			const node = nodes[0];
			node.parent = populateFolder();
			node.parent.permissions.can_write_folder = true;
			node.parent.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.rootId = ROOTS.TRASH;

			global.apolloClient.writeFragment<BaseNodeFragment>({
				fragment: BaseNodeFragmentDoc,
				fragmentName: 'BaseNode',
				data: {
					__typename: 'Folder',
					id: ROOTS.LOCAL_ROOT,
					name: ROOTS.LOCAL_ROOT,
					type: NodeType.Root,
					rootId: null,
					flagged: false,
					permissions: populatePermissions(true)
				}
			});

			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes),
					getNode: mockGetNode({ getNode: [node, node.parent] })
				},
				Mutation: {
					restoreNodes: mockRestoreNodes([{ ...node, rootId: ROOTS.LOCAL_ROOT }])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<SearchView />, {
				initialRouterEntries: [`/${INTERNAL_PATH.SEARCH}`],
				mocks
			});

			// wait the content to be rendered
			await screen.findAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(nodes).not.toBeNull();
			expect(nodes.length).toBeGreaterThan(0);
			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId(SELECTORS.displayer);
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			// right click to open contextual menu
			const nodeToRestoreItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
			await user.rightClick(nodeToRestoreItem);
			const restoreAction = await screen.findByText(ACTION_REGEXP.restore);
			expect(restoreAction).toBeVisible();
			expect(restoreAction).toHaveStyle({
				color: COLORS.text.regular
			});
			await user.click(restoreAction);
			// await snackbar to be shown
			await screen.findByText(/^success$/i);
			expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				nodes.length
			);
			expect(within(screen.getByTestId(SELECTORS.list())).getByText(node.name)).toBeVisible();
			expect(within(screen.getByTestId(SELECTORS.displayer)).getAllByText(node.name)).toHaveLength(
				2
			);
			const restoredNodeItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
			expect(restoredNodeItem).toBeVisible();
			await user.rightClick(restoredNodeItem);
			await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(screen.getByText(ACTION_REGEXP.moveToTrash)).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.deletePermanently)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.restore)).not.toBeInTheDocument();
		});
	});

	it('should not show docs creation actions if docs is available', async () => {
		healthCache.reset();
		const createOptions = spyOnUseCreateOptions();
		server.use(
			http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
				HttpResponse.json({ dependencies: [{ name: DOCS_SERVICE_NAME, live: true }] })
			)
		);
		setup(<SearchView />);
		await waitFor(() => expect(healthCache.healthReceived).toBeTruthy());
		expect(createOptions).toContainEqual(expect.objectContaining({ id: ACTION_IDS.UPLOAD_FILE }));
		expect(createOptions).not.toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_DOCUMENT })
		);
		expect(createOptions).not.toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_SPREADSHEET })
		);
		expect(createOptions).not.toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_PRESENTATION })
		);
	});

	it('should not show docs creation actions if docs is not available', async () => {
		healthCache.reset();
		const createOptions = spyOnUseCreateOptions();
		server.use(
			http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
				HttpResponse.json({ dependencies: [{ name: DOCS_SERVICE_NAME, live: false }] })
			)
		);
		setup(<SearchView />);
		await waitFor(() =>
			expect(createOptions).toContainEqual(expect.objectContaining({ id: ACTION_IDS.UPLOAD_FILE }))
		);
		expect(createOptions).not.toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_DOCUMENT })
		);
		expect(createOptions).not.toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_SPREADSHEET })
		);
		expect(createOptions).not.toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_PRESENTATION })
		);
	});
});
