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
import { populateFile, populateNodes, populateShares } from '../mocks/mockUtils';
import { setup, screen } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { FindNodesQuery, FindNodesQueryVariables, NodeSort } from '../types/graphql/types';
import {
	mockDeleteShares,
	mockFindNodes,
	mockGetNode,
	mockGetCollaborationLinks,
	mockGetLinks
} from '../utils/resolverMocks';
import { getChipLabel } from '../utils/utils';

vi.mock('./components/VirtualizedNodeListItem');

describe('Filter view', () => {
	describe('Shared By Me filter', () => {
		it('should show sorting component', async () => {
			const nodes = populateNodes(10);
			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes)
				}
			} satisfies Partial<Resolvers>;

			setup(
				<Routes>
					<Route path={`filter/:filter?`} element={<FilterView />} />
				</Routes>,
				{
					initialRouterEntries: [`/${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedByMe}`],
					mocks
				}
			);

			await screen.findByText(nodes[0].name);
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.sortDesc })).toBeVisible();
		});

		test('Shared by me filter has sharedByMe=true and excludes trashed nodes', async () => {
			const mockedRequestHandler = vi.fn(handleFindNodesRequest);
			server.use(
				graphql.query<FindNodesQuery, FindNodesQueryVariables>('findNodes', mockedRequestHandler)
			);
			setup(
				<Routes>
					<Route path={`filter/:filter`} element={<FilterView />} />
				</Routes>,
				{
					initialRouterEntries: [`/${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedByMe}`]
				}
			);
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			const expectedVariables = {
				folder_id: ROOTS.LOCAL_ROOT,
				cascade: true,
				shared_by_me: true,
				sort: NodeSort.NameAsc,
				limit: NODES_LOAD_LIMIT,
				shares_limit: SHARES_LOAD_LIMIT,
				direct_share: true
			};
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(mockedRequestHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					variables: expectedVariables
				})
			);
			expect(screen.queryByTestId(SELECTORS.missingFilter)).not.toBeInTheDocument();
		});

		test('Deletion of all collaborators remove node from list. Displayer is closed', async () => {
			const nodes = populateNodes(2);
			const nodeWithShares = populateFile();
			const shares = populateShares(nodeWithShares, 2, true);
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
					deleteShares: mockDeleteShares(
						[shares[0]!.share_target!.id],
						[shares[1]!.share_target!.id]
					)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(
				<Routes>
					<Route path={`/:view/:filter`} element={<FilterView />} />
				</Routes>,
				{
					initialRouterEntries: [
						`/${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedByMe}/?node=${nodeWithShares.id}&tab=sharing`
					],
					mocks
				}
			);
			// render of the list
			await screen.findByText(nodes[0].name);
			// render of the displayer
			await screen.findByText(/sharing/i);
			// render of the sharing tab
			await screen.findByText(/collaborators/i);
			// render of the collaborators
			await screen.findByText(getChipLabel(shares[0].share_target));
			// there should be 2 collaborators
			expect(screen.getByText(getChipLabel(shares[0].share_target))).toBeVisible();
			expect(screen.getByText(getChipLabel(shares[1].share_target))).toBeVisible();
			const nodeItem = screen.getByTestId(SELECTORS.nodeItem(nodeWithShares.id));
			expect(nodeItem).toBeVisible();
			// delete first share
			const trashIcons = screen.getAllByRoleWithIcon('button', { icon: ICON_REGEXP.trash });
			await user.click(trashIcons[0]);
			await screen.findByRole('button', { name: /remove/i });
			await user.click(screen.getByRole('button', { name: /remove/i }));
			await screen.findByText(/success/i);
			expect(screen.getByText(getChipLabel(shares[1].share_target))).toBeVisible();
			expect(nodeItem).toBeVisible();
			// delete second share
			await user.click(trashIcons[1]);
			await screen.findByRole('button', { name: /remove/i });
			await user.click(screen.getByRole('button', { name: /remove/i }));
			await screen.findByText(/success/i);
			// node is removed from main list
			expect(nodeItem).not.toBeInTheDocument();
			// displayer is closed
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			expect(screen.queryByText(nodeWithShares.name)).not.toBeInTheDocument();
			expect(screen.queryByText(/sharing/i)).not.toBeInTheDocument();
		});
	});
});
