/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { fireEvent, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { forEach, map, last } from 'lodash';
import { Route } from 'react-router-dom';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import { FILTER_TYPE, INTERNAL_PATH, NODES_LOAD_LIMIT, ROOTS } from '../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateNodes } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { getFindNodesVariables, mockFindNodes, mockFlagNodes } from '../utils/mockUtils';
import { setup, selectNodes } from '../utils/testUtils';
import FilterView from './FilterView';

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest.fn(),
		removeCreateOptions: jest.fn()
	})
}));

describe('Filter View', () => {
	describe('Flag', () => {
		describe('Selection mode', () => {
			test('Unflag action show a success snackbar and remove unflagged nodes form the list', async () => {
				const currentFilter = populateNodes(8);
				forEach(currentFilter, (mockedNode) => {
					mockedNode.flagged = true;
				});

				const nodesIdsToUnflag = map(
					currentFilter.slice(0, currentFilter.length / 2),
					(item) => item.id
				);

				const mocks = [
					mockFindNodes(
						getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
						currentFilter
					),
					mockFlagNodes(
						{
							node_ids: nodesIdsToUnflag,
							flag: false
						},
						nodesIdsToUnflag
					)
				];

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId('icon: Refresh'));
				expect(screen.queryAllByTestId('icon: Flag')).toHaveLength(currentFilter.length);

				// activate selection mode by selecting items
				await selectNodes(nodesIdsToUnflag, user);

				// check that all wanted items are selected
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(
					nodesIdsToUnflag.length
				);

				const unflagIcon = await screen.findByTestId(ICON_REGEXP.unflag);
				// click on unflag action on header bar
				await user.click(unflagIcon);
				// wait the snackbar with successful state to appear
				await screen.findByText(/Item unflagged successfully/i);
				expect(screen.getAllByTestId('icon: Flag')).toHaveLength(
					currentFilter.length - nodesIdsToUnflag.length
				);
				// unflagged elements are not in the list anymore
				forEach(nodesIdsToUnflag, (nodeId) => {
					expect(screen.queryByTestId(`node-item-${nodeId}`)).not.toBeInTheDocument();
				});
			});
		});

		describe('Contextual Menu', () => {
			test('Unflag action show a success snackbar and remove unflagged nodes form the list', async () => {
				const nodes = populateNodes(2);
				forEach(nodes, (mockedNode) => {
					mockedNode.flagged = true;
				});

				const mocks = [
					mockFindNodes(
						getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
						nodes
					),
					mockFlagNodes(
						{
							node_ids: [nodes[0].id],
							flag: false
						},
						[nodes[0].id]
					)
				];

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId('icon: Refresh'));
				expect(screen.queryAllByTestId('icon: Flag')).toHaveLength(nodes.length);

				// right click to open contextual menu on first node
				const nodeItem = screen.getByTestId(`node-item-${nodes[0].id}`);
				// open context menu and click on unflag action
				fireEvent.contextMenu(nodeItem);
				const unflagAction = await screen.findByText(ACTION_REGEXP.unflag);
				expect(unflagAction).toBeVisible();
				await user.click(unflagAction);
				// wait the snackbar with successful state to appear
				expect(unflagAction).not.toBeInTheDocument();
				await screen.findByText(/Item unflagged successfully/i);
				expect(screen.getAllByTestId('icon: Flag')).toHaveLength(nodes.length - 1);
				// unflagged element is not in the list anymore
				expect(screen.queryByTestId(`node-item-${nodes[0].id}`)).not.toBeInTheDocument();
			});
		});

		test('refetch filter if not all pages are loaded and all nodes are unflagged', async () => {
			const firstPage = populateNodes(NODES_LOAD_LIMIT);
			forEach(firstPage, (node) => {
				node.flagged = true;
			});
			const secondPage = populateNodes(NODES_LOAD_LIMIT);
			forEach(secondPage, (node) => {
				node.flagged = true;
			});
			const nodesToUnflag = map(firstPage, (node) => node.id);

			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
					firstPage
				),
				mockFlagNodes({ node_ids: nodesToUnflag, flag: false }, nodesToUnflag),
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
			await selectNodes(nodesToUnflag, user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(firstPage.length);

			const unflagAction = await screen.findByTestId(ICON_REGEXP.unflag);
			await user.click(unflagAction);
			await waitForElementToBeRemoved(screen.queryByText(firstPage[0].name));
			await screen.findByText(/item unflagged successfully/i);
			await screen.findByText(secondPage[0].name);
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
			expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument();
			expect(screen.queryByText((last(firstPage) as Node).name)).not.toBeInTheDocument();
		});
	});
});
