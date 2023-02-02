/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen } from '@testing-library/react';
import { graphql } from 'msw';
import { Route } from 'react-router-dom';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import server from '../../mocks/server';
import { FILTER_TYPE, INTERNAL_PATH, NODES_LOAD_LIMIT, ROOTS } from '../constants';
import handleFindNodesRequest from '../mocks/handleFindNodesRequest';
import { populateNodes } from '../mocks/mockUtils';
import { FindNodesQuery, FindNodesQueryVariables, NodeSort } from '../types/graphql/types';
import { getFindNodesVariables, mockFindNodes } from '../utils/mockUtils';
import { buildBreadCrumbRegExp, setup } from '../utils/testUtils';
import FilterView from './FilterView';

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
	describe('Flagged filter', () => {
		test('Flagged filter has flagged=true and excludes trashed nodes', async () => {
			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
			});

			await screen.findByText(/view files and folders/i);
			const expectedVariables = {
				flagged: true,
				folder_id: ROOTS.LOCAL_ROOT,
				cascade: true,
				sort: NodeSort.NameAsc,
				limit: NODES_LOAD_LIMIT,
				shares_limit: 1
			};
			expect(mockedRequestHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					variables: expectedVariables
				}),
				expect.anything(),
				expect.anything()
			);
			expect(screen.queryByTestId('missing-filter')).not.toBeInTheDocument();
		});

		test('breadcrumb show Flagged', async () => {
			const nodes = populateNodes(1);
			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
					nodes
				)
			];

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
