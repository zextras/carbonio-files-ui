/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { forEach, map } from 'lodash';
import { graphql, HttpResponse } from 'msw';

import { SearchList } from './SearchList';
import server from '../../../mocks/server';
import { searchParamsVar } from '../../apollo/searchVar';
import { INTERNAL_PATH, NODES_LOAD_LIMIT, ROOTS, TIMERS } from '../../constants';
import { ACTION_REGEXP, COLORS, ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateFolder, populateNodes } from '../../mocks/mockUtils';
import {
	buildChipsFromKeywords,
	createMoveDataTransfer,
	setup,
	selectNodes,
	screen,
	within
} from '../../tests/utils';
import { AdvancedFilters } from '../../types/common';
import { Resolvers } from '../../types/graphql/resolvers-types';
import {
	File as FilesFile,
	GetChildDocument,
	GetChildQuery,
	GetChildrenDocument,
	GetChildrenQuery,
	GetChildrenQueryVariables
} from '../../types/graphql/types';
import {
	getChildrenVariables,
	mockDeletePermanently,
	mockFindNodes,
	mockFlagNodes,
	mockMoveNodes,
	mockRestoreNodes,
	mockTrashNodes
} from '../../utils/resolverMocks';

jest.mock<typeof import('./VirtualizedNodeListItem')>('./VirtualizedNodeListItem');

describe('Search list', () => {
	describe('Drag and drop', () => {
		test('Drag of files in a filter shows upload dropzone with dropzone message. Drop triggers upload in local root', async () => {
			const currentSearch = populateNodes(5, 'File');
			const localRoot = populateFolder(0, ROOTS.LOCAL_ROOT);
			const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
			const files: File[] = [];
			forEach(uploadedFiles, (file) => {
				file.parent = localRoot;
				files.push(new File(['(⌐□_□)'], file.name, { type: file.mime_type }));
			});
			let reqIndex = 0;

			// write local root data in cache as if it was already loaded
			global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(localRoot.id),
				data: {
					getNode: localRoot
				}
			});

			server.use(
				graphql.query<GetChildQuery, GetChildrenQueryVariables>(
					GetChildDocument,
					({ variables }) => {
						const { node_id: id } = variables;
						const result = (reqIndex < uploadedFiles.length && uploadedFiles[reqIndex]) || null;
						if (result) {
							result.id = id;
						}
						reqIndex += 1;
						return HttpResponse.json({ data: { getNode: result } });
					}
				)
			);

			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
			searchParamsVar(searchParams);

			const mocks = {
				Query: {
					findNodes: mockFindNodes(currentSearch)
				}
			} satisfies Partial<Resolvers>;

			const dataTransferObj = {
				types: ['Files'],
				files
			};

			setup(<SearchList />, { mocks });

			await screen.findByText(currentSearch[0].name);

			fireEvent.dragEnter(screen.getByText(currentSearch[0].name), {
				dataTransfer: dataTransferObj
			});

			await screen.findByTestId(SELECTORS.dropzone);
			expect(
				screen.getByText(/Drop here your attachments to quick-add them to your Home/m)
			).toBeVisible();

			fireEvent.drop(screen.getByText(currentSearch[0].name), {
				dataTransfer: dataTransferObj
			});

			await screen.findByText(/upload occurred in Files' home/i);

			expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				currentSearch.length
			);
			expect(screen.queryByText(/Drop here your attachments/m)).not.toBeInTheDocument();

			await waitFor(() => {
				const localRootCachedData = global.apolloClient.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GetChildrenDocument,
					variables: getChildrenVariables(localRoot.id)
				});
				return expect(localRootCachedData?.getNode || null).not.toBeNull();
			});
		});

		test('Drag of a node shows move dropzone in other nodes. Dragged node is disabled. Drop triggers move only on folders with right permissions.	Dragged node is not removed from current filter list', async () => {
			const currentSearch = populateNodes(5);
			const nodesToDrag = [currentSearch[0]];
			forEach(nodesToDrag, (mockedNode) => {
				mockedNode.permissions.can_write_file = true;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.parent = populateFolder();
				mockedNode.parent.permissions.can_write_folder = true;
				mockedNode.parent.permissions.can_write_file = true;
			});
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			currentSearch.unshift(destinationFolder);
			const folderWithoutPermission = populateFolder();
			folderWithoutPermission.permissions.can_write_folder = false;
			folderWithoutPermission.permissions.can_write_file = false;
			currentSearch.unshift(folderWithoutPermission);

			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
			searchParamsVar(searchParams);

			const mocks = {
				Query: {
					findNodes: mockFindNodes(currentSearch)
				},
				Mutation: {
					moveNodes: mockMoveNodes(
						map(nodesToDrag, (node) => ({ ...node, parent: destinationFolder }))
					)
				}
			} satisfies Partial<Resolvers>;

			const dataTransfer = createMoveDataTransfer();

			setup(<SearchList />, { mocks });

			const itemToDrag = await screen.findByText(nodesToDrag[0].name);
			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(itemToDrag, { dataTransfer: dataTransfer() });
			act(() => {
				jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
			});
			// two items are visible for the node, the one in the list is disabled, the other one is the one dragged and is not disabled
			const draggedNodeItems = screen.getAllByText(nodesToDrag[0].name);
			expect(draggedNodeItems).toHaveLength(2);
			expect(draggedNodeItems[0]).toHaveStyle({
				color: COLORS.text.disabled
			});
			expect(draggedNodeItems[1]).toHaveStyle({
				color: COLORS.text.regular
			});
			// dropzone overlay of the list is shown
			await screen.findByTestId(SELECTORS.dropzone);
			expect(screen.getByTestId(SELECTORS.dropzone)).toBeVisible();
			expect(screen.getByText(/drag&drop mode/i)).toBeVisible();
			expect(screen.getByText(/you cannot drop your items in this area/i)).toBeVisible();
			fireEvent.dragLeave(itemToDrag, { dataTransfer: dataTransfer() });

			// drag and drop on folder without permissions
			const folderWithoutPermissionsItem = screen.getByText(folderWithoutPermission.name);
			fireEvent.dragEnter(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
			await screen.findByTestId(SELECTORS.dropzone);
			expect(screen.getByTestId(SELECTORS.dropzone)).toBeVisible();
			expect(screen.queryByText('Drag&Drop Mode')).not.toBeInTheDocument();
			fireEvent.drop(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
			expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
			expect(itemToDrag).toBeVisible();
			expect(itemToDrag).toHaveStyle({
				color: COLORS.text.regular
			});

			// drag and drop on folder with permissions
			const destinationItem = screen.getByText(destinationFolder.name);
			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
			await screen.findByTestId(SELECTORS.dropzone);
			expect(screen.getByTestId(SELECTORS.dropzone)).toBeVisible();
			expect(screen.queryByText('Drag&Drop Mode')).not.toBeInTheDocument();
			fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
			await screen.findByText(/item moved/i);
			expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
			expect(screen.getByText(nodesToDrag[0].name)).toBeInTheDocument();
			expect(screen.getByText(nodesToDrag[0].name)).toBeVisible();
			// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
			expect(screen.getByText(nodesToDrag[0].name)).toHaveStyle({
				color: COLORS.text.regular
			});
		});

		test('Drag of a node without move permissions cause no dropzone to be shown', async () => {
			const currentSearch = populateNodes(5);
			const nodesToDrag = [currentSearch[0]];
			forEach(nodesToDrag, (mockedNode) => {
				mockedNode.permissions.can_write_file = false;
				mockedNode.permissions.can_write_folder = false;
				mockedNode.parent = populateFolder();
				mockedNode.parent.permissions.can_write_folder = true;
				mockedNode.parent.permissions.can_write_file = true;
			});
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			currentSearch.unshift(destinationFolder);
			const folderWithoutPermission = populateFolder();
			folderWithoutPermission.permissions.can_write_folder = false;
			folderWithoutPermission.permissions.can_write_file = false;
			currentSearch.unshift(folderWithoutPermission);

			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
			searchParamsVar(searchParams);

			const mocks = {
				Query: {
					findNodes: mockFindNodes(currentSearch)
				}
			} satisfies Partial<Resolvers>;

			const dataTransfer = createMoveDataTransfer();

			setup(<SearchList />, { mocks });

			const itemToDrag = await screen.findByText(nodesToDrag[0].name);
			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(itemToDrag, { dataTransfer: dataTransfer() });
			await jest.advanceTimersByTimeAsync(TIMERS.SHOW_DROPZONE);
			// two items are visible for the node, the one in the list is disabled, the other one is the one dragged and is not disabled
			const draggedNodeItems = screen.getAllByText(nodesToDrag[0].name);
			expect(draggedNodeItems).toHaveLength(2);
			expect(draggedNodeItems[0]).toHaveStyle({
				color: COLORS.text.disabled
			});
			expect(draggedNodeItems[1]).toHaveStyle({
				color: COLORS.text.regular
			});
			expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
			fireEvent.dragLeave(itemToDrag, { dataTransfer: dataTransfer() });

			// drag and drop on folder without permissions. Overlay is not shown.
			const folderWithoutPermissionsItem = screen.getByText(folderWithoutPermission.name);
			fireEvent.dragEnter(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
			await jest.advanceTimersByTimeAsync(TIMERS.SHOW_DROPZONE);
			expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
			fireEvent.drop(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
			expect(itemToDrag).toBeVisible();
			expect(itemToDrag).toHaveStyle({
				color: COLORS.text.regular
			});

			// drag and drop on folder with permissions. Overlay is not shown.
			const destinationItem = screen.getByText(destinationFolder.name);
			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
			await jest.advanceTimersByTimeAsync(TIMERS.SHOW_DROPZONE);
			expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
			fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
			expect(itemToDrag).toBeVisible();
			expect(itemToDrag).toHaveStyle({
				color: COLORS.text.regular
			});
		});

		test('Drag of multiple nodes is not permitted', async () => {
			const currentFilter = populateNodes(5);
			const nodesToDrag = [...currentFilter];
			const parent = populateFolder();
			parent.permissions.can_write_folder = true;
			parent.permissions.can_write_file = true;
			forEach(nodesToDrag, (mockedNode) => {
				mockedNode.permissions.can_write_file = true;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.parent = parent;
			});
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			destinationFolder.parent = parent;
			currentFilter.unshift(destinationFolder);

			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
			searchParamsVar(searchParams);

			const mocks = {
				Query: {
					findNodes: mockFindNodes(currentFilter)
				},
				Mutation: {
					moveNodes: mockMoveNodes(
						map(nodesToDrag, (node) => ({ ...node, parent: destinationFolder }))
					)
				}
			} satisfies Partial<Resolvers>;

			const dataTransfer = createMoveDataTransfer();

			const { user } = setup(<SearchList />, {
				mocks
			});

			const itemToDrag = await screen.findByText(nodesToDrag[0].name);
			await selectNodes(
				map(nodesToDrag, (node) => node.id),
				user
			);
			// check that all wanted items are selected
			await waitFor(() => {
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodesToDrag.length);
			});

			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			forEach(nodesToDrag, (node) => {
				const draggedImage = screen.getAllByText(node.name);
				expect(draggedImage).toHaveLength(2);
				expect(draggedImage[0]).toHaveStyle({
					color: COLORS.text.disabled
				});
				expect(draggedImage[1]).toHaveStyle({
					color: COLORS.text.regular
				});
			});

			// dropzone is not shown
			const destinationItem = screen.getByText(destinationFolder.name);
			fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
			await jest.advanceTimersByTimeAsync(TIMERS.SHOW_DROPZONE);
			expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
			fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });

			// selection mode stays active
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodesToDrag.length);
		});
	});

	describe('Selection mode', () => {
		describe('Mark for deletion', () => {
			test('Mark for deletion remove selected items from the list if the research does not include trashed nodes', async () => {
				const currentFilter = populateNodes(3);

				currentFilter[0].permissions.can_write_folder = true;
				currentFilter[0].permissions.can_write_file = true;

				const nodesIdsToMFD = [currentFilter[0].id];

				const keywords = ['keyword1', 'keyword2'];
				const searchParams: AdvancedFilters = {
					keywords: buildChipsFromKeywords(keywords),
					folderId: { label: 'Home', value: ROOTS.LOCAL_ROOT }
				};
				searchParamsVar(searchParams);

				const mocks = {
					Query: {
						findNodes: mockFindNodes(currentFilter, currentFilter.slice(1))
					},
					Mutation: {
						trashNodes: mockTrashNodes(nodesIdsToMFD)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<SearchList />, { mocks });
				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
				// activate selection mode by selecting items
				await selectNodes(nodesIdsToMFD, user);
				// check that all wanted items are selected
				expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
				expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
				await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
				const trashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
				expect(trashAction).toHaveStyle({
					color: COLORS.text.regular
				});
				await user.click(trashAction);
				await screen.findByText(/item moved to trash/i);
				expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
				expect(screen.queryAllByTestId(SELECTORS.nodeAvatar).length).toEqual(2);
			});

			test('Mark for deletion is hidden if not all nodes are not trashed', async () => {
				const currentFilter = populateNodes(3);

				currentFilter[0].permissions.can_write_folder = true;
				currentFilter[0].permissions.can_write_file = true;

				currentFilter[1].permissions.can_write_folder = true;
				currentFilter[1].permissions.can_write_file = true;
				currentFilter[1].rootId = ROOTS.TRASH;

				const nodesIdsToMFD = [currentFilter[0].id, currentFilter[1].id];

				const keywords = ['keyword1', 'keyword2'];
				const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
				searchParamsVar(searchParams);

				const mocks = {
					Query: {
						findNodes: mockFindNodes(currentFilter)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<SearchList />, { mocks });

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
				// activate selection mode by selecting items
				await selectNodes(nodesIdsToMFD, user);
				// check that all wanted items are selected
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);

				expect(screen.queryByTestId(ICON_REGEXP.moveToTrash)).not.toBeInTheDocument();
				const moreIconButton = screen.queryByTestId(ICON_REGEXP.moreVertical);
				if (moreIconButton) {
					await user.click(moreIconButton);
					expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
				}
			});
		});

		describe('Restore', () => {
			test('Restore remove selected items from the list if the research includes only trashed nodes', async () => {
				const currentFilter = populateNodes(3);
				forEach(currentFilter, (mockedNode) => {
					mockedNode.rootId = ROOTS.TRASH;
				});

				currentFilter[0].permissions.can_write_folder = true;
				currentFilter[0].permissions.can_write_file = true;

				const nodesIdsToRestore = [currentFilter[0].id];

				const keywords = ['keyword1', 'keyword2'];
				const searchParams: AdvancedFilters = {
					keywords: buildChipsFromKeywords(keywords),
					folderId: { label: 'Trash', value: ROOTS.TRASH },
					cascade: { value: false }
				};
				searchParamsVar(searchParams);

				const mocks = {
					Query: {
						findNodes: mockFindNodes(currentFilter, currentFilter.slice(1))
					},
					Mutation: {
						restoreNodes: mockRestoreNodes([currentFilter[0]])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<SearchList />, { mocks });

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
				// activate selection mode by selecting items
				await selectNodes(nodesIdsToRestore, user);
				// check that all wanted items are selected
				expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
				const selectionModeActiveListHeader = screen.getByTestId(SELECTORS.listHeaderSelectionMode);
				const restoreIcon = within(selectionModeActiveListHeader).getByRoleWithIcon('button', {
					icon: ICON_REGEXP.restore
				});
				expect(restoreIcon).toBeVisible();
				expect(restoreIcon).toBeEnabled();
				await user.click(restoreIcon);
				await screen.findByText(/^success$/i);
				expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
				expect(screen.queryAllByTestId(SELECTORS.nodeAvatar).length).toEqual(2);
			});

			test('Restore does not remove selected items from the list if the research includes both trashed and restored nodes', async () => {
				const currentFilter = populateNodes(3);

				currentFilter[0].permissions.can_write_folder = true;
				currentFilter[0].permissions.can_write_file = true;
				currentFilter[0].rootId = ROOTS.TRASH;

				const nodesIdsToRestore = [currentFilter[0].id];

				const keywords = ['keyword1', 'keyword2'];
				const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
				searchParamsVar(searchParams);

				const mocks = {
					Query: {
						findNodes: mockFindNodes(currentFilter, currentFilter)
					},
					Mutation: {
						restoreNodes: mockRestoreNodes([currentFilter[0]])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<SearchList />, { mocks });

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
				// activate selection mode by selecting items
				await selectNodes(nodesIdsToRestore, user);
				// check that all wanted items are selected
				expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
				const selectionModeActiveListHeader = screen.getByTestId(SELECTORS.listHeaderSelectionMode);
				const restoreIcon = within(selectionModeActiveListHeader).getByRoleWithIcon('button', {
					icon: ICON_REGEXP.restore
				});
				expect(restoreIcon).toBeVisible();
				expect(restoreIcon).toBeEnabled();
				const unselectAllIcon = screen.getByTestId(ICON_REGEXP.exitSelectionMode);
				expect(unselectAllIcon).toBeInTheDocument();
				expect(unselectAllIcon).toBeVisible();
				await user.click(restoreIcon);
				await screen.findByText(/^success$/i);
				const elementsWithSelectionModeOff = await screen.findAllByTestId(SELECTORS.nodeAvatar);
				const restoredItem = screen.getByText(currentFilter[0].name);
				expect(restoredItem).toBeInTheDocument();
				expect(restoredItem).toBeVisible();
				expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(3);
				expect(elementsWithSelectionModeOff).toHaveLength(3);
			});

			test('Restore is hidden if not all nodes are trashed', async () => {
				const currentFilter = populateNodes(3);

				currentFilter[0].permissions.can_write_folder = true;
				currentFilter[0].permissions.can_write_file = true;
				currentFilter[0].rootId = ROOTS.LOCAL_ROOT;

				currentFilter[1].permissions.can_write_folder = true;
				currentFilter[1].permissions.can_write_file = true;
				currentFilter[1].rootId = ROOTS.TRASH;

				const nodesIdsToRestore = [currentFilter[0].id, currentFilter[1].id];

				const keywords = ['keyword1', 'keyword2'];
				const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
				searchParamsVar(searchParams);
				const mocks = {
					Query: {
						findNodes: mockFindNodes(currentFilter)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<SearchList />, { mocks });

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
				// activate selection mode by selecting items
				await selectNodes(nodesIdsToRestore, user);
				// check that all wanted items are selected
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);
				expect(screen.queryByTestId(ICON_REGEXP.restore)).not.toBeInTheDocument();
				expect(screen.queryByTestId(ICON_REGEXP.moveToTrash)).not.toBeInTheDocument();
				const moreIconButton = screen.queryByTestId(ICON_REGEXP.moreVertical);
				if (moreIconButton) {
					await user.click(moreIconButton);
					expect(screen.queryByText(ACTION_REGEXP.restore)).not.toBeInTheDocument();
					expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
				}
			});
		});

		describe('Delete Permanently', () => {
			test('Delete Permanently remove selected items from the list', async () => {
				const currentFilter = populateNodes(3);

				currentFilter[0].rootId = ROOTS.TRASH;
				currentFilter[0].permissions.can_write_folder = true;
				currentFilter[0].permissions.can_write_file = true;
				currentFilter[0].permissions.can_delete = true;

				const nodesIdsToDeletePermanently = [currentFilter[0].id];

				const keywords = ['keyword1', 'keyword2'];
				const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
				searchParamsVar(searchParams);

				const mocks = {
					Query: {
						findNodes: mockFindNodes(currentFilter, currentFilter.slice(1))
					},
					Mutation: {
						deleteNodes: mockDeletePermanently(nodesIdsToDeletePermanently)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<SearchList />, { mocks });

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
				// activate selection mode by selecting items
				await selectNodes(nodesIdsToDeletePermanently, user);
				// check that all wanted items are selected
				expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
				const element = await screen.findByText(currentFilter[0].name);
				const selectionModeActiveListHeader = screen.getByTestId(SELECTORS.listHeaderSelectionMode);
				const deletePermanentlyIcon = within(selectionModeActiveListHeader).getByRoleWithIcon(
					'button',
					{ icon: ICON_REGEXP.deletePermanently }
				);
				expect(deletePermanentlyIcon).toBeVisible();
				expect(deletePermanentlyIcon).toBeEnabled();
				await user.click(deletePermanentlyIcon);
				const confirmButton = await screen.findByRole('button', { name: /delete permanently/i });
				act(() => {
					// run timers of modal
					jest.runOnlyPendingTimers();
				});
				await user.click(confirmButton);
				await screen.findByText(/^success$/i);
				expect(confirmButton).not.toBeInTheDocument();
				expect(element).not.toBeInTheDocument();
				expect(screen.queryByTestId(SELECTORS.uncheckedAvatar)).not.toBeInTheDocument();
				expect(screen.getAllByTestId(SELECTORS.nodeAvatar)).toHaveLength(2);
			});

			test('Delete Permanently is hidden if not all nodes are trashed', async () => {
				const currentFilter = populateNodes(3);

				currentFilter[0].permissions.can_write_folder = true;
				currentFilter[0].permissions.can_write_file = true;
				currentFilter[0].rootId = ROOTS.LOCAL_ROOT;

				currentFilter[1].permissions.can_write_folder = true;
				currentFilter[1].permissions.can_write_file = true;
				currentFilter[1].rootId = ROOTS.TRASH;

				const nodesIdsToDeletePermanently = [currentFilter[0].id, currentFilter[1].id];

				const keywords = ['keyword1', 'keyword2'];
				const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
				searchParamsVar(searchParams);

				const mocks = {
					Query: {
						findNodes: mockFindNodes(currentFilter)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<SearchList />, { mocks });

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
				// activate selection mode by selecting items
				await selectNodes(nodesIdsToDeletePermanently, user);
				// check that all wanted items are selected
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);
				const selectionModeActiveListHeader = screen.getByTestId(SELECTORS.listHeaderSelectionMode);
				const restoreIcon = within(selectionModeActiveListHeader).queryByTestId(
					ICON_REGEXP.restore
				);
				expect(restoreIcon).not.toBeInTheDocument();
				const trashIcon = within(selectionModeActiveListHeader).queryByTestId(
					ICON_REGEXP.moveToTrash
				);
				expect(trashIcon).not.toBeInTheDocument();
				const deletePermanentlyIcon = within(selectionModeActiveListHeader).queryByTestId(
					ICON_REGEXP.deletePermanently
				);
				expect(deletePermanentlyIcon).not.toBeInTheDocument();
				const moreIcon = within(selectionModeActiveListHeader).queryByTestId(
					ICON_REGEXP.moreVertical
				);
				expect(moreIcon).not.toBeInTheDocument();
			});
		});

		test('if there is no element selected, all actions are visible and disabled', async () => {
			const nodes = populateNodes(10);
			const keywords = ['k1', 'k2'];
			const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
			searchParamsVar(searchParams);
			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<SearchList />, {
				mocks,
				initialRouterEntries: [INTERNAL_PATH.SEARCH]
			});
			await screen.findByText(nodes[0].name);
			await screen.findByText(/[1-9] advanced filter(s)?/i);
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

			expect(screen.queryByTestId(ICON_REGEXP.moveToTrash)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.restore)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.deletePermanently)).not.toBeInTheDocument();

			expect(screen.queryByTestId(ICON_REGEXP.rename)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.copy)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.move)).not.toBeInTheDocument();

			expect(screen.queryByTestId(ICON_REGEXP.flag)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.unflag)).not.toBeInTheDocument();

			expect(screen.queryByTestId(ICON_REGEXP.download)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.openDocument)).not.toBeInTheDocument();

			const exitSelectionModeItem = screen.getByTestId(ICON_REGEXP.exitSelectionMode);
			expect(exitSelectionModeItem).toBeVisible();
			await user.click(exitSelectionModeItem);
			await screen.findByText(/[1-9] advanced filter(s)?/i);
			expect(screen.queryByTestId(ICON_REGEXP.moveToTrash)).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.uncheckedAvatar)).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			expect(screen.queryByText(/select all/i)).not.toBeInTheDocument();
		});
	});

	describe('Pagination of partial data', () => {
		test('Move to trash of all loaded nodes refetch search if trashed nodes are not included', async () => {
			const firstPage = populateNodes(NODES_LOAD_LIMIT);
			forEach(firstPage, (node) => {
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
			});
			const secondPage = populateNodes(NODES_LOAD_LIMIT);
			forEach(secondPage, (node) => {
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
			});
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = {
				keywords: buildChipsFromKeywords(keywords),
				folderId: { value: ROOTS.LOCAL_ROOT },
				cascade: { value: true }
			};
			searchParamsVar(searchParams);
			const nodesToTrash = map(firstPage, (node) => node.id);

			const mocks = {
				Query: {
					findNodes: mockFindNodes(firstPage, secondPage)
				},
				Mutation: {
					trashNodes: mockTrashNodes(nodesToTrash)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<SearchList />, { mocks });

			await screen.findByText(firstPage[0].name);
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getByText(firstPage[NODES_LOAD_LIMIT - 1].name)).toBeVisible();
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();
			await selectNodes(nodesToTrash, user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(firstPage.length);

			const moreIconButton = screen.getByTestId(ICON_REGEXP.moreVertical);
			await user.click(moreIconButton);

			const trashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(trashAction).toBeVisible();
			await user.click(trashAction);
			await waitFor(() => expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument());
			await screen.findByText(/item moved to trash/i);
			await screen.findByText(secondPage[0].name);
			expect(screen.queryByText(firstPage[NODES_LOAD_LIMIT - 1].name)).not.toBeInTheDocument();
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
		});

		test('Restore of all loaded nodes refetch search if only trashed nodes are included', async () => {
			const firstPage = populateNodes(NODES_LOAD_LIMIT);
			forEach(firstPage, (node) => {
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
				node.rootId = ROOTS.TRASH;
			});
			const secondPage = populateNodes(NODES_LOAD_LIMIT);
			forEach(secondPage, (node) => {
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
				node.rootId = ROOTS.TRASH;
			});
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = {
				keywords: buildChipsFromKeywords(keywords),
				folderId: { value: ROOTS.TRASH },
				cascade: { value: false }
			};
			searchParamsVar(searchParams);
			const nodesToRestore = map(firstPage, (node) => node.id);

			const mocks = {
				Query: {
					findNodes: mockFindNodes(firstPage, secondPage)
				},
				Mutation: {
					restoreNodes: mockRestoreNodes(firstPage)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<SearchList />, { mocks });

			await screen.findByText(firstPage[0].name);
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getByText(firstPage[NODES_LOAD_LIMIT - 1].name)).toBeVisible();
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();
			await selectNodes(nodesToRestore, user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(firstPage.length);

			expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();

			const restoreAction = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.restore });
			expect(restoreAction).toBeVisible();
			expect(restoreAction).toBeEnabled();
			await user.click(restoreAction);
			await waitFor(() => expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument());
			await screen.findByText(/^success$/i);
			await screen.findByText(secondPage[0].name);
			expect(screen.queryByText(firstPage[NODES_LOAD_LIMIT - 1].name)).not.toBeInTheDocument();
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
		});

		test('Delete permanently of all loaded nodes refetch search', async () => {
			const firstPage = populateNodes(NODES_LOAD_LIMIT);
			forEach(firstPage, (node) => {
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_delete = true;
				node.rootId = ROOTS.TRASH;
			});
			const secondPage = populateNodes(NODES_LOAD_LIMIT);
			forEach(secondPage, (node) => {
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
				node.permissions.can_delete = true;
				node.rootId = ROOTS.TRASH;
			});
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = {
				keywords: buildChipsFromKeywords(keywords),
				folderId: { value: ROOTS.TRASH },
				cascade: { value: false }
			};
			searchParamsVar(searchParams);
			const nodesToDelete = map(firstPage, (node) => node.id);

			const mocks = {
				Query: {
					findNodes: mockFindNodes(firstPage, secondPage)
				},
				Mutation: {
					deleteNodes: mockDeletePermanently(nodesToDelete)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<SearchList />, { mocks });

			await screen.findByText(firstPage[0].name);
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getByText(firstPage[NODES_LOAD_LIMIT - 1].name)).toBeVisible();
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();
			await selectNodes(nodesToDelete, user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(firstPage.length);
			expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();
			const deletePermanentlyAction = screen.getByRoleWithIcon('button', {
				icon: ICON_REGEXP.deletePermanently
			});
			expect(deletePermanentlyAction).toBeVisible();
			expect(deletePermanentlyAction).toBeEnabled();
			await user.click(deletePermanentlyAction);
			const modalConfirmButton = await screen.findByRole('button', {
				name: ACTION_REGEXP.deletePermanently
			});
			act(() => {
				// run modal timers
				jest.runOnlyPendingTimers();
			});
			await user.click(modalConfirmButton);
			await waitFor(() =>
				expect(
					screen.queryByRole('button', {
						name: ACTION_REGEXP.deletePermanently
					})
				).not.toBeInTheDocument()
			);
			await screen.findByText(/^success$/i);
			await screen.findByText(secondPage[0].name);
			expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument();
			expect(screen.queryByText(firstPage[NODES_LOAD_LIMIT - 1].name)).not.toBeInTheDocument();
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
		});

		test('Unflag does not remove nodes from list even if only flagged nodes are included', async () => {
			const firstPage = populateNodes(NODES_LOAD_LIMIT);
			forEach(firstPage, (node) => {
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
				node.flagged = true;
			});
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = {
				keywords: buildChipsFromKeywords(keywords),
				flagged: { value: true }
			};
			searchParamsVar(searchParams);
			const nodesToUnflag = [firstPage[0].id, firstPage[1].id];

			const mocks = {
				Query: {
					findNodes: mockFindNodes(firstPage)
				},
				Mutation: {
					flagNodes: mockFlagNodes(nodesToUnflag)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<SearchList />, {
				mocks,
				initialRouterEntries: [INTERNAL_PATH.SEARCH]
			});

			await screen.findByText(firstPage[0].name);
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			const nodeToUnflagItem1 = screen.getByTestId(SELECTORS.nodeItem(nodesToUnflag[0]));
			expect(nodeToUnflagItem1).toBeVisible();
			expect(within(nodeToUnflagItem1).getByTestId(ICON_REGEXP.flagged)).toBeVisible();
			await selectNodes(nodesToUnflag, user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodesToUnflag.length);
			expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();
			const unflagIcon = await screen.findByRoleWithIcon('button', { icon: ICON_REGEXP.unflag });
			expect(unflagIcon).toBeVisible();
			expect(unflagIcon).toBeEnabled();
			await user.click(unflagIcon);
			expect(within(nodeToUnflagItem1).queryByTestId(ICON_REGEXP.flagged)).not.toBeInTheDocument();
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getByText(firstPage[1].name)).toBeVisible();
			expect(screen.getAllByTestId(ICON_REGEXP.flagged)).toHaveLength(
				firstPage.length - nodesToUnflag.length
			);
		});
	});
});
