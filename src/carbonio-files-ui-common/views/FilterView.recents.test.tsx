/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act, screen } from '@testing-library/react';
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
import { populateNodes } from '../mocks/mockUtils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { FindNodesQuery, FindNodesQueryVariables, NodeSort } from '../types/graphql/types';
import { mockFindNodes } from '../utils/resolverMocks';
import { setup } from '../utils/testUtils';

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions');

describe('Filter View', () => {
	describe('Recents filter', () => {
		test('Recents filter is sort by updated_at_desc and excludes trashed nodes', async () => {
			const mockedRequestHandler = jest.fn(handleFindNodesRequest);
			server.use(
				graphql.query<FindNodesQuery, FindNodesQueryVariables>('findNodes', mockedRequestHandler)
			);
			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.recents}`]
			});
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			const expectedVariables = {
				folder_id: ROOTS.LOCAL_ROOT,
				cascade: true,
				sort: NodeSort.UpdatedAtDesc,
				limit: NODES_LOAD_LIMIT,
				shares_limit: SHARES_LOAD_LIMIT
			};
			await act(async () => {
				await jest.advanceTimersToNextTimerAsync();
			});
			expect(mockedRequestHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					variables: expectedVariables
				})
			);
			expect(screen.queryByText(SELECTORS.missingFilter)).not.toBeInTheDocument();
		});

		test('Sorting component is hidden', async () => {
			const nodes = populateNodes(10);
			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes)
				}
			} satisfies Partial<Resolvers>;

			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.recents}`],
				mocks
			});

			await screen.findByText(nodes[0].name);
			expect(screen.queryByTestId(ICON_REGEXP.sortAsc)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.sortDesc)).not.toBeInTheDocument();
		});
	});
});
