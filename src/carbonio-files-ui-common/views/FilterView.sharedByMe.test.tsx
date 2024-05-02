/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act, screen, within } from '@testing-library/react';
import { find } from 'lodash';
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
import { DISPLAYER_EMPTY_MESSAGE, ICON_REGEXP, SELECTORS } from '../constants/test';
import handleFindNodesRequest from '../mocks/handleFindNodesRequest';
import { populateNode, populateNodes, populateShares } from '../mocks/mockUtils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { FindNodesQuery, FindNodesQueryVariables, NodeSort } from '../types/graphql/types';
import {
	mockDeleteShare,
	mockFindNodes,
	mockGetNode,
	mockGetCollaborationLinks,
	mockGetLinks
} from '../utils/resolverMocks';
import { setup } from '../utils/testUtils';
import { getChipLabel } from '../utils/utils';

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions');

describe('Filter view', () => {
	describe('Shared By Me filter', () => {
		test('Shared by me filter has sharedByMe=true and excludes trashed nodes', async () => {
			const mockedRequestHandler = jest.fn(handleFindNodesRequest);
			server.use(
				graphql.query<FindNodesQuery, FindNodesQueryVariables>('findNodes', mockedRequestHandler)
			);
			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedByMe}`]
			});
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
				await jest.advanceTimersToNextTimerAsync();
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
			const nodeWithShares = populateNode();
			const shares = populateShares(nodeWithShares, 2);
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
					deleteShare: mockDeleteShare(true, true)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(
				<Route path={`/:view/:filter`}>
					<FilterView />
				</Route>,
				{
					initialRouterEntries: [
						`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedByMe}/?node=${nodeWithShares.id}&tab=sharing`
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
			// there should be 2 chips for collaborators
			const chipItems = screen.getAllByTestId(SELECTORS.chipWithPopover);
			expect(chipItems).toHaveLength(2);
			const share1Item = find(
				chipItems,
				(chipItem) => within(chipItem).queryByText(getChipLabel(shares[0].share_target)) !== null
			);
			const share2Item = find(
				chipItems,
				(chipItem) => within(chipItem).queryByText(getChipLabel(shares[1].share_target)) !== null
			);
			const nodeItem = screen.getByTestId(SELECTORS.nodeItem(nodeWithShares.id));
			expect(nodeItem).toBeVisible();
			expect(share1Item).toBeDefined();
			expect(share2Item).toBeDefined();
			expect(share1Item).toBeVisible();
			expect(share2Item).toBeVisible();
			// delete first share
			await user.click(within(share1Item as HTMLElement).getByTestId(ICON_REGEXP.close));
			await screen.findByRole('button', { name: /remove/i });
			await user.click(screen.getByRole('button', { name: /remove/i }));
			await screen.findByText(/success/i);
			expect(share2Item).toBeVisible();
			expect(nodeItem).toBeVisible();
			// delete second share
			await user.click(within(share2Item as HTMLElement).getByTestId(ICON_REGEXP.close));
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
