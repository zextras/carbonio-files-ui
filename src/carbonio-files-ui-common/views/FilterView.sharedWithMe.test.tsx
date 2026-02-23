/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act } from '@testing-library/react';
import { graphql } from 'msw';
import { Route, Routes } from 'react-router-dom';

import FilterView from './FilterView';
import server from '../../mocks/server';
import {
	FILTER_TYPE,
	INTERNAL_PATH,
	NODES_LOAD_LIMIT,
	ROOTS,
	SHARES_LOAD_LIMIT
} from '../constants';
import { DISPLAYER_EMPTY_MESSAGE, ICON_REGEXP, SELECTORS } from '../constants/test';
import handleFindNodesRequest from '../mocks/handleFindNodesRequest';
import { populateNodes, populateShare, populateUser } from '../mocks/mockUtils';
import { setup, within, screen } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { FindNodesQuery, FindNodesQueryVariables, NodeSort } from '../types/graphql/types';
import {
	mockDeleteShares,
	mockFindNodes,
	mockGetNode,
	mockGetCollaborationLinks,
	mockGetLinks
} from '../utils/resolverMocks';

vi.mock('./components/VirtualizedNodeListItem');

describe('Filter view', () => {
	describe('Shared With Me filter', () => {
		it('should show sorting component', async () => {
			const nodes = populateNodes(10);
			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes)
				}
			} satisfies Partial<Resolvers>;

			setup(
				<Routes>
					<Route path={`filter/:filter`} element={<FilterView />} />
				</Routes>,
				{
					initialRouterEntries: [`/${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedWithMe}`],
					mocks
				}
			);

			await screen.findByText(nodes[0].name);
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.sortDesc })).toBeVisible();
		});

		test('Shared with me filter has sharedWithMe=true and excludes trashed nodes', async () => {
			const mockedRequestHandler = vi.fn(handleFindNodesRequest);
			server.use(
				graphql.query<FindNodesQuery, FindNodesQueryVariables>('findNodes', mockedRequestHandler)
			);
			setup(
				<Routes>
					<Route path={`filter/:filter`} element={<FilterView />} />
				</Routes>,
				{
					initialRouterEntries: [`/${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedWithMe}`]
				}
			);
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			const expectedVariables = {
				folder_id: ROOTS.LOCAL_ROOT,
				cascade: true,
				shared_with_me: true,
				sort: NodeSort.NameAsc,
				limit: NODES_LOAD_LIMIT,
				shares_limit: SHARES_LOAD_LIMIT,
				direct_share: true
			};
			await act(async () => {
				await vi.runOnlyPendingTimersAsync();
			});
			expect(mockedRequestHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					variables: expectedVariables
				})
			);
			expect(screen.queryByTestId(SELECTORS.missingFilter)).not.toBeInTheDocument();
		});

		test('Node is removed from the list if user remove his share', async () => {
			const currentFilter = populateNodes(2);
			const node = currentFilter[0];
			node.owner = populateUser();
			const mockedUserLogged = populateUser(
				global.mockedUserLogged.id,
				global.mockedUserLogged.name
			);
			node.shares = [populateShare({ ...node, shares: [] }, 'share-to-remove', mockedUserLogged)];

			const mocks = {
				Query: {
					findNodes: mockFindNodes(currentFilter),
					getNode: mockGetNode({ getNode: [node], getShares: [node] }),
					getLinks: mockGetLinks(node.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				},
				Mutation: {
					deleteShares: mockDeleteShares([mockedUserLogged.id])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(
				<Routes>
					<Route path={`/:view/:filter?`} element={<FilterView />} />
				</Routes>,
				{
					initialRouterEntries: [
						`/${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedWithMe}/?node=${node.id}&tab=sharing`
					],
					mocks
				}
			);

			await act(async () => {
				await vi.runOnlyPendingTimersAsync();
			});
			await screen.findAllByText(node.name);
			// logged user is shown
			await screen.findByText(/you$/i);
			const sharingContent = screen.getByTestId(SELECTORS.nodeSharing);
			// owner is visible
			expect(within(sharingContent).getByText(`${node.owner.full_name} - Owner`)).toBeVisible();
			// close button is visible on logged user collaborator
			expect(within(sharingContent).getByTestId(ICON_REGEXP.trash)).toBeVisible();
			await user.click(within(sharingContent).getByTestId(ICON_REGEXP.trash));
			// confirmation modal
			await user.click(await screen.findByRole('button', { name: /remove/i }));
			await screen.findByText(/success/i);
			// close snackbar
			act(() => {
				// run timers of snackbar
				vi.runOnlyPendingTimers();
			});
			// node is removed from the list and displayer is closed
			expect(screen.queryByText(node.name)).not.toBeInTheDocument();
			expect(screen.queryByText(/you$/i)).not.toBeInTheDocument();
			expect(screen.queryByText(/details/i)).not.toBeInTheDocument();
		});
	});
});
