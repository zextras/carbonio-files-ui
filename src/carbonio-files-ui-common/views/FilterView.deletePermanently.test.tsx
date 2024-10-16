/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { forEach, map, last } from 'lodash';
import { Route } from 'react-router-dom';

import FilterView from './FilterView';
import { FILTER_TYPE, INTERNAL_PATH, NODES_LOAD_LIMIT, ROOTS } from '../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFile, populateNodes } from '../mocks/mockUtils';
import { setup, selectNodes, screen, within } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { mockDeletePermanently, mockFindNodes } from '../utils/resolverMocks';

jest.mock<typeof import('./components/VirtualizedNodeListItem')>(
	'./components/VirtualizedNodeListItem'
);

describe('Filter View', () => {
	describe('Delete Permanently', () => {
		describe('Selection Mode', () => {
			test('Delete Permanently remove selected items from the filter list', async () => {
				const currentFilter = populateNodes(3);
				forEach(currentFilter, (mockedNode) => {
					mockedNode.rootId = ROOTS.TRASH;
				});

				currentFilter[0].permissions.can_write_folder = true;
				currentFilter[0].permissions.can_write_file = true;
				currentFilter[0].permissions.can_delete = true;

				const nodesIdsToDeletePermanently = [currentFilter[0].id];

				const mocks = {
					Query: {
						findNodes: mockFindNodes(currentFilter)
					},
					Mutation: {
						deleteNodes: mockDeletePermanently(nodesIdsToDeletePermanently)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
				});

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
					jest.advanceTimersToNextTimer();
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
				forEach(currentFilter, (mockedNode) => {
					mockedNode.flagged = true;
				});

				currentFilter[0].permissions.can_write_folder = true;
				currentFilter[0].permissions.can_write_file = true;
				currentFilter[0].rootId = ROOTS.LOCAL_ROOT;

				currentFilter[1].permissions.can_write_folder = true;
				currentFilter[1].permissions.can_write_file = true;
				currentFilter[1].rootId = ROOTS.TRASH;

				const nodesIdsToDeletePermanently = [currentFilter[0].id, currentFilter[1].id];

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
				await selectNodes(nodesIdsToDeletePermanently, user);
				// check that all wanted items are selected
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);

				const selectionModeActiveListHeader = screen.getByTestId(SELECTORS.listHeaderSelectionMode);

				const restoreIcon = within(selectionModeActiveListHeader).queryByTestId(
					ICON_REGEXP.restore
				);
				expect(restoreIcon).not.toBeInTheDocument();

				const trashIcon = within(selectionModeActiveListHeader).queryByTestId(ICON_REGEXP.trash);
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

		describe('Contextual Menu', () => {
			test('Delete Permanently is hidden if the node is not trashed', async () => {
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
				const deletePermanentlyAction = screen.queryByText(ACTION_REGEXP.deletePermanently);
				expect(deletePermanentlyAction).not.toBeInTheDocument();
			});
		});

		test('refetch trash filter if not all pages are loaded and all nodes are deleted permanently', async () => {
			const firstPage = populateNodes(NODES_LOAD_LIMIT);
			forEach(firstPage, (mockedNode) => {
				mockedNode.rootId = ROOTS.TRASH;
				mockedNode.permissions.can_delete = true;
			});
			const secondPage = populateNodes(NODES_LOAD_LIMIT);
			forEach(secondPage, (mockedNode) => {
				mockedNode.rootId = ROOTS.TRASH;
				mockedNode.permissions.can_delete = true;
			});
			const nodesToDelete = map(firstPage, (node) => node.id);

			const mocks = {
				Query: {
					findNodes: mockFindNodes(firstPage, secondPage)
				},
				Mutation: {
					deleteNodes: mockDeletePermanently(nodesToDelete)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
			});

			await screen.findByText(firstPage[0].name);
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getByText(last(firstPage)!.name)).toBeVisible();
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();

			// select all loaded nodes
			await selectNodes(nodesToDelete, user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(firstPage.length);

			const deletePermanentlyAction = await screen.findByRoleWithIcon('button', {
				icon: ICON_REGEXP.deletePermanently
			});
			expect(deletePermanentlyAction).toBeVisible();
			expect(deletePermanentlyAction).toBeEnabled();
			await user.click(deletePermanentlyAction);
			const confirmDeleteButton = await screen.findByRole('button', {
				name: ACTION_REGEXP.deletePermanently
			});
			await user.click(confirmDeleteButton);
			await waitFor(() => expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument());
			await screen.findByText(/^success$/i);
			await screen.findByText(secondPage[0].name);
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
			expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument();
			expect(screen.queryByText(last(firstPage)!.name)).not.toBeInTheDocument();
		});
	});
});
