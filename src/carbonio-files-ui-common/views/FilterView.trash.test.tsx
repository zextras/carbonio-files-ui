/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act, screen, waitFor, within } from '@testing-library/react';
import { forEach } from 'lodash';
import { graphql } from 'msw';
import { Route } from 'react-router-dom';

import FilterView from './FilterView';
import server from '../../mocks/server';
import {
	FILTER_TYPE,
	INTERNAL_PATH,
	NODES_LOAD_LIMIT,
	ROOTS,
	SHARES_LOAD_LIMIT
} from '../constants';
import { ACTION_REGEXP, DISPLAYER_EMPTY_MESSAGE, ICON_REGEXP, SELECTORS } from '../constants/test';
import handleFindNodesRequest from '../mocks/handleFindNodesRequest';
import { populateLocalRoot, populateNode, populateNodes } from '../mocks/mockUtils';
import { selectNodes, setup } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { FindNodesQuery, FindNodesQueryVariables, NodeSort } from '../types/graphql/types';
import {
	mockDeletePermanently,
	mockFindNodes,
	mockGetNode,
	mockRestoreNodes
} from '../utils/resolverMocks';

describe('Filter view', () => {
	describe('Trash filter', () => {
		test('Restore close the displayer from trash views', async () => {
			const nodes = populateNodes(10);
			nodes.forEach((node) => {
				node.rootId = ROOTS.TRASH;
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
			});
			const node = nodes[0];
			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes),
					getNode: mockGetNode({ getNode: [node] })
				},
				Mutation: {
					restoreNodes: mockRestoreNodes([{ ...node, rootId: ROOTS.LOCAL_ROOT }])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<Route path={`/:view/:filter?`}>
					<FilterView />
				</Route>,
				{
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`],
					mocks
				}
			);
			// wait the content to be rendered
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			await screen.findAllByTestId(SELECTORS.nodeItem(), { exact: false });
			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId(SELECTORS.displayer);
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			const restoreAction = within(displayer).getByTestId(ICON_REGEXP.restore);
			expect(restoreAction).toBeVisible();
			await user.click(restoreAction);
			await waitFor(() =>
				expect(screen.queryAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
					nodes.length - 1
				)
			);
			await screen.findByText(/^success$/i);
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			expect(within(displayer).queryByText(node.name)).not.toBeInTheDocument();
			expect(restoreAction).not.toBeInTheDocument();
			expect(screen.getByText(DISPLAYER_EMPTY_MESSAGE)).toBeVisible();
		});

		test('Delete permanently close the displayer from trash views', async () => {
			const node = populateNode();
			node.rootId = ROOTS.TRASH;
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_delete = true;
			const mocks = {
				Query: {
					findNodes: mockFindNodes([node]),
					getNode: mockGetNode({ getNode: [node] })
				},
				Mutation: {
					deleteNodes: mockDeletePermanently([node.id])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<Route path={`/:view/:filter?`}>
					<FilterView />
				</Route>,
				{
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`],
					mocks
				}
			);
			// wait the content to be rendered
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			await screen.findAllByTestId(SELECTORS.nodeItem(), { exact: false });
			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId(SELECTORS.displayer);
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			const deletePermanentlyAction = within(displayer).getByTestId(ICON_REGEXP.deletePermanently);
			expect(deletePermanentlyAction).toBeVisible();
			await user.click(deletePermanentlyAction);
			const deletePermanentlyConfirm = await screen.findByRole('button', {
				name: ACTION_REGEXP.deletePermanently
			});
			await user.click(deletePermanentlyConfirm);
			await screen.findByText(/The trash is empty/i);
			await screen.findByText(/success/i);
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			expect(deletePermanentlyConfirm).not.toBeInTheDocument();
			expect(within(displayer).queryByText(node.name)).not.toBeInTheDocument();
			expect(deletePermanentlyAction).not.toBeInTheDocument();
		});

		test('in trash filter only restore and delete permanently actions are visible', async () => {
			const node = populateNode();
			node.rootId = ROOTS.TRASH;
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_delete = true;
			node.parent = populateLocalRoot();
			const mocks = {
				Query: {
					findNodes: mockFindNodes([node]),
					getNode: mockGetNode({ getNode: [node] })
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<Route path={`/:view/:filter?`}>
					<FilterView />
				</Route>,
				{ initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`], mocks }
			);
			// right click to open contextual menu
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			const nodeItem = await screen.findByText(node.name);
			await user.rightClick(nodeItem);
			// check that restore action becomes visible
			const restoreAction = await screen.findByText(ACTION_REGEXP.restore);
			expect(restoreAction).toBeVisible();
			expect(screen.getByText(ACTION_REGEXP.deletePermanently)).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.flag)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.unflag)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.move)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.download)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.copy)).not.toBeInTheDocument();

			// selection mode
			await selectNodes([node.id], user);
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();
			const restoreActionSelection = await within(
				screen.getByTestId(SELECTORS.listHeaderSelectionMode)
			).findByTestId(ICON_REGEXP.restore);
			expect(restoreActionSelection).toBeVisible();
			expect(
				within(screen.getByTestId(SELECTORS.listHeaderSelectionMode)).getByTestId(
					ICON_REGEXP.deletePermanently
				)
			).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.flag)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.unflag)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.move)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.download)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.copy)).not.toBeInTheDocument();
			// exit selection mode
			await user.click(screen.getByTestId(ICON_REGEXP.exitSelectionMode));
			expect(restoreActionSelection).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			// displayer
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			const displayer = screen.getByTestId(SELECTORS.displayer);
			await within(displayer).findAllByText(node.name);
			expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();
			expect(within(displayer).getByTestId(ICON_REGEXP.restore)).toBeVisible();
			expect(within(displayer).getByTestId(ICON_REGEXP.deletePermanently)).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.flag)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.unflag)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.move)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.download)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.copy)).not.toBeInTheDocument();
		});

		test('if there is no element selected, trash actions are hidden', async () => {
			const nodes = populateNodes(10);
			forEach(nodes, (mockedNode) => {
				mockedNode.rootId = ROOTS.TRASH;
			});

			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
			});
			await screen.findByText(nodes[0].name);
			expect(screen.getByText(nodes[0].name)).toBeVisible();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			await selectNodes([nodes[0].id], user);
			// check that all wanted items are selected
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			expect(screen.getByText(/select all/i)).toBeVisible();
			// deselect node. Selection mode remains active
			await selectNodes([nodes[0].id], user);
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			expect(screen.getAllByTestId(SELECTORS.uncheckedAvatar)).toHaveLength(nodes.length);
			expect(screen.getByText(/select all/i)).toBeVisible();

			expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.restore)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.deletePermanently)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.moveToTrash)).not.toBeInTheDocument();

			expect(screen.getByTestId(ICON_REGEXP.exitSelectionMode)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.exitSelectionMode));
			const listHeader = screen.getByTestId(SELECTORS.listHeader, { exact: false });
			expect(screen.queryByTestId(ICON_REGEXP.exitSelectionMode)).not.toBeInTheDocument();
			expect(within(listHeader).queryByTestId(ICON_REGEXP.restore)).not.toBeInTheDocument();
			expect(
				within(listHeader).queryByTestId(ICON_REGEXP.deletePermanently)
			).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.uncheckedAvatar)).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			expect(screen.queryByText(/select all/i)).not.toBeInTheDocument();
		});
	});

	describe('My Trash filter', () => {
		test('My Trash filter sharedWithMe=false and includes only trashed nodes', async () => {
			const mockedRequestHandler = jest.fn(handleFindNodesRequest);
			server.use(
				graphql.query<FindNodesQuery, FindNodesQueryVariables>('findNodes', mockedRequestHandler)
			);
			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
			});
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			const expectedVariables = {
				folder_id: ROOTS.TRASH,
				cascade: false,
				shared_with_me: false,
				sort: NodeSort.NameAsc,
				limit: NODES_LOAD_LIMIT,
				shares_limit: SHARES_LOAD_LIMIT
			};
			await act(async () => {
				await jest.advanceTimersToNextTimerAsync();
			});
			expect(mockedRequestHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					variables: expectedVariables
				})
			);
			expect(screen.queryByTestId(SELECTORS.missingFilter)).not.toBeInTheDocument();
		});
	});

	describe('Shared Trash filter', () => {
		test('Shared trash filter has sharedWithMe=true and includes only trashed nodes', async () => {
			const mockedRequestHandler = jest.fn(handleFindNodesRequest);
			server.use(
				graphql.query<FindNodesQuery, FindNodesQueryVariables>('findNodes', mockedRequestHandler)
			);
			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedTrash}`]
			});
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			const expectedVariables = {
				folder_id: ROOTS.TRASH,
				cascade: false,
				shared_with_me: true,
				sort: NodeSort.NameAsc,
				limit: NODES_LOAD_LIMIT,
				shares_limit: SHARES_LOAD_LIMIT
			};
			await act(async () => {
				await jest.advanceTimersToNextTimerAsync();
			});
			expect(mockedRequestHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					variables: expectedVariables
				})
			);
			expect(screen.queryByTestId(SELECTORS.missingFilter)).not.toBeInTheDocument();
		});
	});
});
