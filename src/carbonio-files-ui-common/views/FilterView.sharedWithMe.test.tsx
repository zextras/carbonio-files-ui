/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen, within } from '@testing-library/react';
import { graphql } from 'msw';
import { Route } from 'react-router-dom';

import FilterView from './FilterView';
import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import server from '../../mocks/server';
import {
	FILTER_TYPE,
	INTERNAL_PATH,
	NODES_LOAD_LIMIT,
	ROOTS,
	SHARES_LOAD_LIMIT
} from '../constants';
import { ICON_REGEXP, SELECTORS } from '../constants/test';
import handleFindNodesRequest from '../mocks/handleFindNodesRequest';
import { populateNodes, populateShare, populateUser } from '../mocks/mockUtils';
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

const mockedRequestHandler = jest.fn();

beforeEach(() => {
	mockedRequestHandler.mockImplementation(handleFindNodesRequest);
	server.use(
		graphql.query<FindNodesQuery, FindNodesQueryVariables>('findNodes', mockedRequestHandler)
	);
});

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest.fn(),
		removeCreateOptions: jest.fn()
	})
}));

describe('Filter view', () => {
	describe('Shared With Me filter', () => {
		test('Shared with me filter has sharedWithMe=true and excludes trashed nodes', async () => {
			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedWithMe}`]
			});
			await screen.findByText(/view files and folders/i);
			const expectedVariables = {
				folder_id: ROOTS.LOCAL_ROOT,
				cascade: true,
				shared_with_me: true,
				sort: NodeSort.NameAsc,
				limit: NODES_LOAD_LIMIT,
				shares_limit: SHARES_LOAD_LIMIT,
				direct_share: true
			};
			expect(mockedRequestHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					variables: expectedVariables
				}),
				expect.anything(),
				expect.anything()
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
					deleteShare: mockDeleteShare(true)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(
				<Route path={`/:view/:filter?`}>
					<FilterView />
				</Route>,
				{ initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedWithMe}`], mocks }
			);
			await screen.findByText(/view files and folders/i);
			await screen.findByText(node.name);
			// open displayer
			await user.click(screen.getByText(node.name));
			await screen.findByText(/sharing/i);
			// go to share tab
			await user.click(screen.getByText(/sharing/i));
			// logged user chip is shown
			await screen.findByText(/you$/i);
			const sharingContent = screen.getByTestId(SELECTORS.nodeSharing);
			// owner chip is visible
			expect(within(sharingContent).getByText(node.owner.full_name)).toBeVisible();
			// close button is visible on logged user chip
			expect(within(sharingContent).getByTestId(ICON_REGEXP.close)).toBeVisible();
			await user.click(within(sharingContent).getByTestId(ICON_REGEXP.close));
			// confirmation modal
			await screen.findByRole('button', { name: /remove/i });
			await user.click(screen.getByRole('button', { name: /remove/i }));
			await screen.findByText(/success/i);
			// node is removed from the list and displayer is closed
			expect(screen.queryByText(node.name)).not.toBeInTheDocument();
			expect(screen.queryByText(/you$/i)).not.toBeInTheDocument();
			expect(screen.queryByText(/details/i)).not.toBeInTheDocument();
		});
	});
});
