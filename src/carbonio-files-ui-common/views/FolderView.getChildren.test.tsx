/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { ApolloError } from '@apollo/client';
import { screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import { forEach } from 'lodash';
import { graphql } from 'msw';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import server from '../../mocks/server';
import { NODES_LOAD_LIMIT } from '../constants';
import GET_CHILDREN from '../graphql/queries/getChildren.graphql';
import { populateFolder, populateNodePage } from '../mocks/mockUtils';
import { Node } from '../types/common';
import {
	Folder,
	GetChildQuery,
	GetChildQueryVariables,
	GetChildrenQuery,
	GetChildrenQueryVariables
} from '../types/graphql/types';
import {
	getChildrenVariables,
	mockGetChild,
	mockGetChildren,
	mockGetChildrenError,
	mockGetParent,
	mockGetPermissions
} from '../utils/mockUtils';
import { generateError, setup, triggerLoadMore } from '../utils/testUtils';
import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest.fn(),
		removeCreateOptions: jest.fn()
	})
}));

jest.mock('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): JSX.Element => (
		<div data-testid="displayer-test-id">
			{props.translationKey}:{props.icons}
		</div>
	)
}));

describe('Get children', () => {
	test('access to a folder with network error response show an error page', async () => {
		const currentFolder = populateFolder();
		const mocks = [
			mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
			mockGetChild({ node_id: currentFolder.id }, currentFolder),
			mockGetChildrenError(
				getChildrenVariables(currentFolder.id),
				new ApolloError({ graphQLErrors: [generateError('An error occurred')] })
			),
			// query is made 2 times (?)
			mockGetChildrenError(
				getChildrenVariables(currentFolder.id),
				new ApolloError({ graphQLErrors: [generateError('An error occurred')] })
			)
		];

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		await waitForElementToBeRemoved(screen.queryByTestId('icon: Refresh'));

		await screen.findByText(/An error occurred/i);
	});

	test('first access to a folder show loading state and than show children', async () => {
		const currentFolder = populateFolder();

		server.use(
			graphql.query<GetChildQuery, GetChildQueryVariables>('getChild', (req, res, ctx) => {
				let result = null;
				if (req.variables.node_id === currentFolder.id) {
					result = currentFolder;
				}
				return res(ctx.data({ getNode: result }));
			})
		);

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`]
		});

		const listHeader = screen.getByTestId('list-header');
		expect(within(listHeader).getByTestId('icon: Refresh')).toBeVisible();
		await waitFor(() =>
			expect(screen.getByTestId(`list-${currentFolder.id}`)).not.toBeEmptyDOMElement()
		);
		expect(within(listHeader).queryByTestId('icon: Refresh')).not.toBeInTheDocument();
		const queryResult = global.apolloClient.readQuery<GetChildrenQuery, GetChildrenQueryVariables>({
			query: GET_CHILDREN,
			variables: getChildrenVariables(currentFolder.id)
		});
		forEach((queryResult?.getNode as Folder).children.nodes, (child) => {
			const $child = child as Node;
			expect(screen.getByTestId(`node-item-${$child.id}`)).toBeInTheDocument();
			expect(screen.getByTestId(`node-item-${$child.id}`)).toHaveTextContent($child.name);
		});
	});

	test('intersectionObserver trigger the fetchMore function to load more elements when observed element is intersected', async () => {
		const currentFolder = populateFolder(NODES_LOAD_LIMIT + Math.floor(NODES_LOAD_LIMIT / 2));

		const mocks = [
			mockGetParent(
				{
					node_id: currentFolder.id
				},
				currentFolder
			),
			mockGetChildren(getChildrenVariables(currentFolder.id), {
				...currentFolder,
				children: populateNodePage(currentFolder.children.nodes.slice(0, NODES_LOAD_LIMIT))
			} as Folder),
			mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
			mockGetChild({ node_id: currentFolder.id }, currentFolder),
			mockGetChildren(
				getChildrenVariables(currentFolder.id, undefined, undefined, undefined, true),
				{
					...currentFolder,
					children: populateNodePage(currentFolder.children.nodes.slice(NODES_LOAD_LIMIT))
				} as Folder
			)
		];

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// this is the loading refresh icon
		expect(screen.getByTestId('list-header')).toContainElement(screen.getByTestId('icon: Refresh'));
		expect(within(screen.getByTestId('list-header')).getByTestId('icon: Refresh')).toBeVisible();
		await waitForElementToBeRemoved(
			within(screen.getByTestId('list-header')).queryByTestId('icon: Refresh')
		);
		// wait the rendering of the first item
		await screen.findByTestId(`node-item-${(currentFolder.children.nodes[0] as Node).id}`);
		expect(
			screen.getByTestId(
				`node-item-${(currentFolder.children.nodes[NODES_LOAD_LIMIT - 1] as Node).id}`
			)
		).toBeVisible();
		// the loading icon should be still visible at the bottom of the list because we have load the max limit of items per page
		expect(screen.getByTestId('icon: Refresh')).toBeVisible();

		// elements after the limit should not be rendered
		expect(
			screen.queryByTestId(
				`node-item-${(currentFolder.children.nodes[NODES_LOAD_LIMIT] as Node).id}`
			)
		).not.toBeInTheDocument();

		await triggerLoadMore();

		// wait for the response
		await screen.findByTestId(
			`node-item-${(currentFolder.children.nodes[NODES_LOAD_LIMIT] as Node).id}`
		);

		// now all elements are loaded so last children should be visible and no loading icon should be rendered
		expect(
			screen.getByTestId(
				`node-item-${
					(currentFolder.children.nodes[currentFolder.children.nodes.length - 1] as Node).id
				}`
			)
		).toBeVisible();
		expect(screen.queryByTestId('Icon: Refresh')).not.toBeInTheDocument();
	});
});
