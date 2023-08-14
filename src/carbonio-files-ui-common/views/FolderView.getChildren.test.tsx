/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import { forEach } from 'lodash';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import { NODES_LOAD_LIMIT } from '../constants';
import { ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFolder } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { QueryResolvers, Resolvers } from '../types/graphql/resolvers-types';
import { mockGetNode, mockGetPath } from '../utils/resolverMocks';
import { generateError, setup, triggerLoadMore } from '../utils/testUtils';

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions');

jest.mock<typeof import('./components/Displayer')>('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): JSX.Element => (
		<div data-testid="displayer-test-id">
			{props.translationKey}:{props.icons}
		</div>
	)
}));

describe('Get children', () => {
	test('access to a folder with network error response show an error page', async () => {
		const currentFolder = populateFolder();
		const getNodeResolver: QueryResolvers['getNode'] = (parent, args, context, info) => {
			if (info.operation.name?.value === 'getChildren') {
				throw generateError('An error occurred');
			}
			return currentFolder;
		};
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: getNodeResolver
			}
		} satisfies Partial<Resolvers>;

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

		await screen.findByText(/An error occurred/i);
	});

	test('first access to a folder show loading state and than show children', async () => {
		const currentFolder = populateFolder();

		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
			}
		} satisfies Partial<Resolvers>;
		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		const listHeader = screen.getByTestId(SELECTORS.listHeader);
		expect(within(listHeader).getByTestId(ICON_REGEXP.queryLoading)).toBeVisible();
		await waitFor(() =>
			expect(screen.getByTestId(SELECTORS.list(currentFolder.id))).not.toBeEmptyDOMElement()
		);
		expect(within(listHeader).queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument();
		forEach(currentFolder.children.nodes, (child) => {
			expect(screen.getByText((child as Node).name)).toBeVisible();
		});
	});

	test('intersectionObserver trigger the fetchMore function to load more elements when observed element is intersected', async () => {
		const currentFolder = populateFolder(NODES_LOAD_LIMIT + Math.floor(NODES_LOAD_LIMIT / 2));

		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				// use default children resolver to split children in pages
				getNode: mockGetNode({
					getChildren: [currentFolder, currentFolder],
					getPermissions: [currentFolder]
				})
			}
		} satisfies Partial<Resolvers>;

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// this is the loading refresh icon
		expect(screen.getByTestId(SELECTORS.listHeader)).toContainElement(
			screen.getByTestId(ICON_REGEXP.queryLoading)
		);
		expect(
			within(screen.getByTestId(SELECTORS.listHeader)).getByTestId(ICON_REGEXP.queryLoading)
		).toBeVisible();
		await waitForElementToBeRemoved(
			within(screen.getByTestId(SELECTORS.listHeader)).queryByTestId(ICON_REGEXP.queryLoading)
		);
		// wait the rendering of the first item
		await screen.findByTestId(SELECTORS.nodeItem((currentFolder.children.nodes[0] as Node).id));
		expect(
			screen.getByTestId(
				SELECTORS.nodeItem((currentFolder.children.nodes[NODES_LOAD_LIMIT - 1] as Node).id)
			)
		).toBeVisible();
		// the loading icon should be still visible at the bottom of the list because we have load the max limit of items per page
		expect(screen.getByTestId(ICON_REGEXP.queryLoading)).toBeVisible();

		// elements after the limit should not be rendered
		expect(
			screen.queryByTestId(
				SELECTORS.nodeItem((currentFolder.children.nodes[NODES_LOAD_LIMIT] as Node).id)
			)
		).not.toBeInTheDocument();

		await triggerLoadMore();

		// wait for the response
		await screen.findByTestId(
			SELECTORS.nodeItem((currentFolder.children.nodes[NODES_LOAD_LIMIT] as Node).id)
		);

		// now all elements are loaded so last children should be visible and no loading icon should be rendered
		expect(
			screen.getByTestId(
				SELECTORS.nodeItem(
					(currentFolder.children.nodes[currentFolder.children.nodes.length - 1] as Node).id
				)
			)
		).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument();
	});
});
