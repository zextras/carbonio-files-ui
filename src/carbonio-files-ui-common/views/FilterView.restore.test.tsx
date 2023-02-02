/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { fireEvent, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { forEach, map, last } from 'lodash';
import { Route } from 'react-router-dom';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import { FILTER_TYPE, INTERNAL_PATH, NODES_LOAD_LIMIT, ROOTS } from '../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFile, populateLocalRoot, populateNode, populateNodes } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { getFindNodesVariables, mockFindNodes, mockRestoreNodes } from '../utils/mockUtils';
import { setup, selectNodes } from '../utils/testUtils';
import FilterView from './FilterView';

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest.fn(),
		removeCreateOptions: jest.fn()
	})
}));

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

				const mocks = [
					mockFindNodes(
						getFindNodesVariables({
							folder_id: ROOTS.TRASH,
							cascade: false,
							shared_with_me: false
						}),
						currentFilter
					),
					mockRestoreNodes(
						{
							node_ids: nodesIdsToRestore
						},
						[{ ...currentFilter[0], rootId: ROOTS.LOCAL_ROOT, parent: populateLocalRoot() }]
					)
				];

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId('icon: Refresh'));
				// activate selection mode by selecting items
				await selectNodes(nodesIdsToRestore, user);
				// check that all wanted items are selected
				expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();

				const selectionModeActiveListHeader = screen.getByTestId('list-header-selectionModeActive');

				const restoreIcon = within(selectionModeActiveListHeader).getByTestId(
					'icon: RestoreOutline'
				);
				expect(restoreIcon).toBeInTheDocument();
				expect(restoreIcon).toBeVisible();
				expect(restoreIcon).not.toHaveAttribute('disabled', '');

				await user.click(restoreIcon);

				await screen.findByText(/^success$/i);
				expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

				expect(screen.queryAllByTestId(`file-icon-preview`).length).toEqual(2);

				expect.assertions(6);
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

				const mocks = [
					mockFindNodes(
						getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
						currentFilter
					)
				];

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId('icon: Refresh'));
				// activate selection mode by selecting items
				await selectNodes(nodesIdsToRestore, user);
				// check that all wanted items are selected
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);
				expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();

				const selectionModeActiveListHeader = screen.getByTestId('list-header-selectionModeActive');

				const restoreIcon = within(selectionModeActiveListHeader).queryByTestId(
					'icon: RestoreOutline'
				);
				expect(restoreIcon).not.toBeInTheDocument();

				const trashIcon = within(selectionModeActiveListHeader).queryByTestId(
					'icon: Trash2Outline'
				);
				expect(trashIcon).not.toBeInTheDocument();

				const moreIcon = within(selectionModeActiveListHeader).queryByTestId('icon: MoreVertical');
				expect(moreIcon).not.toBeInTheDocument();

				expect.assertions(5);
			});
		});

		describe('Contextual Menu', () => {
			test('Restore is hidden if the node is not trashed', async () => {
				const node = populateFile();
				node.permissions.can_write_file = true;
				node.rootId = ROOTS.LOCAL_ROOT;

				const mocks = [
					mockFindNodes(
						getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
						[node]
					)
				];

				setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId('icon: Refresh'));

				// right click to open contextual menu
				const nodeItem = screen.getByTestId(`node-item-${node.id}`);
				fireEvent.contextMenu(nodeItem);
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

			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ folder_id: ROOTS.TRASH, cascade: false, shared_with_me: false }),
					firstPage
				),
				mockRestoreNodes({ node_ids: nodesToRestore }, firstPage),
				mockFindNodes(
					getFindNodesVariables({ folder_id: ROOTS.TRASH, cascade: false, shared_with_me: false }),
					secondPage
				)
			];

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

			const restoreAction = await screen.findByTestId(ICON_REGEXP.restore);
			expect(restoreAction).toBeVisible();
			expect(restoreAction.parentNode).not.toHaveAttribute('disabled', '');
			await user.click(restoreAction);
			await waitForElementToBeRemoved(screen.queryByText(firstPage[0].name));
			await screen.findByText(/^success$/i);
			await screen.findByText(secondPage[0].name);
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
			expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument();
			expect(screen.queryByText((last(firstPage) as Node).name)).not.toBeInTheDocument();
		});
	});
});
