/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { forEach, map, last } from 'lodash';
import { Route } from 'react-router-dom';

import FilterView from './FilterView';
import { FILTER_TYPE, INTERNAL_PATH, NODES_LOAD_LIMIT, ROOTS } from '../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFile, populateNodes } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { Resolvers } from '../types/graphql/resolvers-types';
import { mockFindNodes, mockTrashNodes } from '../utils/resolverMocks';
import { setup, selectNodes, screen, within } from '../utils/testUtils';

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions');

describe('Filter View', () => {
	describe('Mark for deletion', () => {
		describe('Selection mode', () => {
			test('Mark for deletion remove selected items from the filter list', async () => {
				const currentFilter = populateNodes(3);
				forEach(currentFilter, (mockedNode) => {
					mockedNode.flagged = true;
				});

				currentFilter[0].permissions.can_write_folder = true;
				currentFilter[0].permissions.can_write_file = true;

				const nodesIdsToMFD = [currentFilter[0].id];

				const mocks = {
					Query: {
						findNodes: mockFindNodes(currentFilter)
					},
					Mutation: {
						trashNodes: mockTrashNodes(nodesIdsToMFD)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
				// activate selection mode by selecting items
				await selectNodes(nodesIdsToMFD, user);
				// check that all wanted items are selected
				expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
				expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
				await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));

				const trashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
				expect(trashAction).toBeInTheDocument();
				expect(trashAction).toBeVisible();
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(trashAction).not.toHaveAttribute('disabled', '');

				await user.click(trashAction);

				// wait for the snackbar to appear and disappear
				await screen.findByText(/item moved to trash/i);
				expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

				expect(screen.queryAllByTestId(SELECTORS.nodeAvatar).length).toEqual(2);
			});

			test('Mark for deletion is hidden if not all nodes are not trashed', async () => {
				const currentFilter = populateNodes(3);
				forEach(currentFilter, (mockedNode) => {
					mockedNode.flagged = true;
				});

				currentFilter[0].permissions.can_write_folder = true;
				currentFilter[0].permissions.can_write_file = true;

				currentFilter[1].permissions.can_write_folder = true;
				currentFilter[1].permissions.can_write_file = true;
				currentFilter[1].rootId = ROOTS.TRASH;

				const nodesIdsToMFD = [currentFilter[0].id, currentFilter[1].id];

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
				await selectNodes(nodesIdsToMFD, user);
				// check that all wanted items are selected
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);

				const selectionModeActiveListHeader = screen.getByTestId(SELECTORS.listHeaderSelectionMode);

				const trashIcon = within(selectionModeActiveListHeader).queryByTestId(
					ICON_REGEXP.moveToTrash
				);
				expect(trashIcon).not.toBeInTheDocument();
			});
		});

		describe('Contextual Menu', () => {
			test('Mark for deletion is hidden if the node is trashed', async () => {
				const node = populateFile();
				node.permissions.can_write_file = true;
				node.rootId = ROOTS.TRASH;

				const mocks = {
					Query: {
						findNodes: mockFindNodes([node])
					}
				} satisfies Partial<Resolvers>;

				setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

				// right click to open contextual menu
				const nodeItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
				fireEvent.contextMenu(nodeItem);
				const restoreAction = await screen.findByText(ACTION_REGEXP.restore);
				expect(restoreAction).toBeVisible();
				const moveToTrashAction = screen.queryByText(ACTION_REGEXP.moveToTrash);
				expect(moveToTrashAction).not.toBeInTheDocument();
			});
		});

		test('refetch filter if not all pages are loaded and all nodes are trashed', async () => {
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
			const nodesToTrash = map(firstPage, (node) => node.id);

			const mocks = {
				Query: {
					findNodes: mockFindNodes(firstPage, secondPage)
				},
				Mutation: {
					trashNodes: mockTrashNodes(nodesToTrash)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
			});

			await screen.findByText(firstPage[0].name);
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getByText((last(firstPage) as Node).name)).toBeVisible();
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();

			// select all loaded nodes
			await selectNodes(nodesToTrash, user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(firstPage.length);
			expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
			const trashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(trashAction).toBeVisible();
			// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
			expect(trashAction.parentNode).not.toHaveAttribute('disabled', '');
			await user.click(trashAction);
			await waitFor(() => expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument());
			await screen.findByText(/item moved to trash/i);
			await screen.findByText(secondPage[0].name);
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
			expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument();
			expect(screen.queryByText((last(firstPage) as Node).name)).not.toBeInTheDocument();
		});
	});
});
