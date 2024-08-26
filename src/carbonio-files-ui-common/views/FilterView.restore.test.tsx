/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { forEach, map, last } from 'lodash';
import { Route } from 'react-router-dom';

import FilterView from './FilterView';
import { FILTER_TYPE, INTERNAL_PATH, NODES_LOAD_LIMIT, ROOTS } from '../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFile, populateLocalRoot, populateNode, populateNodes } from '../mocks/mockUtils';
import { setup, selectNodes, screen, within } from '../tests/utils';
import { Node } from '../types/common';
import { Resolvers } from '../types/graphql/resolvers-types';
import { mockFindNodes, mockRestoreNodes } from '../utils/resolverMocks';

describe('Filter View', () => {
	describe('Restore', () => {
		describe('Selection Mode', () => {
			test('Restore remove selected items from the list', async () => {
				const currentFilter = populateNodes(3);
				forEach(currentFilter, (mockedNode) => {
					mockedNode.rootId = ROOTS.TRASH;
					mockedNode.parent = populateNode('Folder', ROOTS.TRASH, 'Trash');
				});

				currentFilter[0].permissions.can_write_folder = true;
				currentFilter[0].permissions.can_write_file = true;

				const nodesIdsToRestore = [currentFilter[0].id];

				const mocks = {
					Query: {
						findNodes: mockFindNodes(currentFilter)
					},
					Mutation: {
						restoreNodes: mockRestoreNodes([
							{ ...currentFilter[0], rootId: ROOTS.LOCAL_ROOT, parent: populateLocalRoot() }
						])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
				});

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

			test('Restore is hidden if not all nodes are trashed', async () => {
				const currentFilter = populateNodes(3);
				forEach(currentFilter, (mockedNode) => {
					mockedNode.flagged = true;
				});

				currentFilter[0].permissions.can_write_folder = true;
				currentFilter[0].permissions.can_write_file = true;
				currentFilter[0].rootId = ROOTS.LOCAL_ROOT;

				currentFilter[1].permissions.can_write_folder = true;
				currentFilter[1].permissions.can_write_file = true;
				currentFilter[1].rootId = ROOTS.TRASH;

				const nodesIdsToRestore = [currentFilter[0].id, currentFilter[1].id];

				const mocks = {
					Query: {
						findNodes: mockFindNodes(currentFilter)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
				// activate selection mode by selecting items
				await selectNodes(nodesIdsToRestore, user);
				// check that all wanted items are selected
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);
				expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();

				const selectionModeActiveListHeader = screen.getByTestId(SELECTORS.listHeaderSelectionMode);

				const restoreIcon = within(selectionModeActiveListHeader).queryByTestId(
					ICON_REGEXP.restore
				);
				expect(restoreIcon).not.toBeInTheDocument();

				const trashIcon = within(selectionModeActiveListHeader).queryByTestId(
					ICON_REGEXP.moveToTrash
				);
				expect(trashIcon).not.toBeInTheDocument();

				const moreIcon = within(selectionModeActiveListHeader).queryByTestId(
					ICON_REGEXP.moreVertical
				);
				expect(moreIcon).not.toBeInTheDocument();
			});
		});

		describe('Contextual Menu', () => {
			test('Restore is hidden if the node is not trashed', async () => {
				const node = populateFile();
				node.permissions.can_write_file = true;
				node.rootId = ROOTS.LOCAL_ROOT;

				const mocks = {
					Query: {
						findNodes: mockFindNodes([node])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

				// right click to open contextual menu
				const nodeItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
				await user.rightClick(nodeItem);
				const renameAction = await screen.findByText(ACTION_REGEXP.rename);
				expect(renameAction).toBeVisible();
				const moveToTrashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
				expect(moveToTrashAction).toBeVisible();
				const restoreAction = screen.queryByText(ACTION_REGEXP.restore);
				expect(restoreAction).not.toBeInTheDocument();
			});
		});

		test('refetch trash filter if not all pages are loaded and all nodes are restored', async () => {
			const firstPage = populateNodes(NODES_LOAD_LIMIT);
			forEach(firstPage, (node) => {
				node.rootId = ROOTS.TRASH;
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
			});
			const secondPage = populateNodes(NODES_LOAD_LIMIT);
			forEach(secondPage, (node) => {
				node.rootId = ROOTS.TRASH;
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
			});
			const nodesToRestore = map(firstPage, (node) => node.id);

			const mocks = {
				Query: {
					findNodes: mockFindNodes(firstPage, secondPage)
				},
				Mutation: {
					restoreNodes: mockRestoreNodes(firstPage)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
			});

			await screen.findByText(firstPage[0].name);
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getByText((last(firstPage) as Node).name)).toBeVisible();
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();

			// select all loaded nodes
			await selectNodes(nodesToRestore, user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(firstPage.length);

			const restoreAction = await screen.findByRoleWithIcon('button', {
				icon: ICON_REGEXP.restore
			});
			expect(restoreAction).toBeVisible();
			expect(restoreAction).toBeEnabled();
			await user.click(restoreAction);
			await waitFor(() => expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument());
			await screen.findByText(/^success$/i);
			await screen.findByText(secondPage[0].name);
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
			expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument();
			expect(screen.queryByText((last(firstPage) as Node).name)).not.toBeInTheDocument();
		});
	});
});
