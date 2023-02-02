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
import { ACTION_REGEXP, SELECTORS } from '../constants/test';
import { populateFile, populateNodes } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { getFindNodesVariables, mockFindNodes, mockTrashNodes } from '../utils/mockUtils';
import { setup, selectNodes } from '../utils/testUtils';
import FilterView from './FilterView';

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest.fn(),
		removeCreateOptions: jest.fn()
	})
}));

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

				const mocks = [
					mockFindNodes(
						getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
						currentFilter
					),
					mockTrashNodes(
						{
							node_ids: nodesIdsToMFD
						},
						nodesIdsToMFD
					)
				];

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId('icon: Refresh'));
				// activate selection mode by selecting items
				await selectNodes(nodesIdsToMFD, user);
				// check that all wanted items are selected
				expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
				expect(screen.getByTestId('icon: MoreVertical')).toBeVisible();
				await user.click(screen.getByTestId('icon: MoreVertical'));

				const trashIcon = await screen.findByText(ACTION_REGEXP.moveToTrash);
				expect(trashIcon).toBeInTheDocument();
				expect(trashIcon).toBeVisible();
				expect(trashIcon).not.toHaveAttribute('disabled', '');

				await user.click(trashIcon);

				// wait for the snackbar to appear and disappear
				await screen.findByText(/item moved to trash/i);
				expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

				expect(screen.queryAllByTestId(`file-icon-preview`).length).toEqual(2);

				expect.assertions(7);
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
				await selectNodes(nodesIdsToMFD, user);
				// check that all wanted items are selected
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);

				const selectionModeActiveListHeader = screen.getByTestId('list-header-selectionModeActive');

				const trashIcon = within(selectionModeActiveListHeader).queryByTestId(
					'icon: Trash2Outline'
				);
				expect(trashIcon).not.toBeInTheDocument();
				expect.assertions(2);
			});
		});

		describe('Contextual Menu', () => {
			test('Mark for deletion is hidden if the node is trashed', async () => {
				const node = populateFile();
				node.permissions.can_write_file = true;
				node.rootId = ROOTS.TRASH;

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

			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
					firstPage
				),
				mockTrashNodes({ node_ids: nodesToTrash }, nodesToTrash),
				mockFindNodes(
					getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
					secondPage
				)
			];

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
			expect(screen.getByTestId('icon: MoreVertical')).toBeVisible();
			await user.click(screen.getByTestId('icon: MoreVertical'));
			const trashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(trashAction).toBeVisible();
			expect(trashAction.parentNode).not.toHaveAttribute('disabled', '');
			await user.click(trashAction);
			await waitForElementToBeRemoved(screen.queryByText(firstPage[0].name));
			await screen.findByText(/item moved to trash/i);
			await screen.findByText(secondPage[0].name);
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
			expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument();
			expect(screen.queryByText((last(firstPage) as Node).name)).not.toBeInTheDocument();
		});
	});
});
