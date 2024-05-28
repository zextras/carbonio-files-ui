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
import { DISPLAYER_EMPTY_MESSAGE, SELECTORS } from '../constants/test';
import handleFindNodesRequest from '../mocks/handleFindNodesRequest';
import { populateNodes } from '../mocks/mockUtils';
import { buildBreadCrumbRegExp, setup } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { FindNodesQuery, FindNodesQueryVariables, NodeSort } from '../types/graphql/types';
import { mockFindNodes } from '../utils/resolverMocks';

type FindNodesHandler = typeof handleFindNodesRequest;
const mockedRequestHandler = jest.fn<ReturnType<FindNodesHandler>, Parameters<FindNodesHandler>>();

beforeEach(() => {
	mockedRequestHandler.mockImplementation(handleFindNodesRequest);
	server.use(
		graphql.query<FindNodesQuery, FindNodesQueryVariables>('findNodes', mockedRequestHandler)
	);
});

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions');

describe('Filter view', () => {
	describe('Flagged filter', () => {
		test('Flagged filter has flagged=true and excludes trashed nodes', async () => {
			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
			});

			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			const expectedVariables = {
				flagged: true,
				folder_id: ROOTS.LOCAL_ROOT,
				cascade: true,
				sort: NodeSort.NameAsc,
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
			expect(screen.queryByTestId(SELECTORS.missingFilter)).not.toBeInTheDocument();
		});

		test('breadcrumb show Flagged', async () => {
			const nodes = populateNodes(1);
			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes)
				}
			} satisfies Partial<Resolvers>;

			const { getByTextWithMarkup } = setup(
				<Route path={`/:view/:filter?`} component={FilterView} />,
				{
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`],
					mocks
				}
			);

			await screen.findByText(nodes[0].name);
			const breadcrumbRegExp = buildBreadCrumbRegExp('Flagged');
			expect(getByTextWithMarkup(breadcrumbRegExp)).toBeVisible();
		});
	});
});
