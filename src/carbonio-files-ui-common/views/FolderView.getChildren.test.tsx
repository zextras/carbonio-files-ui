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
import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import { NODES_LOAD_LIMIT } from '../constants';
import { ICON_REGEXP } from '../constants/test';
import { populateFolder, populateNodePage } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { FolderResolvers, QueryResolvers, Resolvers } from '../types/graphql/resolvers-types';
import { mockGetNode, mockGetPath } from '../utils/mockUtils';
import { generateError, setup, triggerLoadMore } from '../utils/testUtils';

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
				getNode: mockGetNode(currentFolder)
			}
		} satisfies Partial<Resolvers>;
		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		const listHeader = screen.getByTestId('list-header');
		expect(within(listHeader).getByTestId(ICON_REGEXP.queryLoading)).toBeVisible();
		await waitFor(() =>
			expect(screen.getByTestId(`list-${currentFolder.id}`)).not.toBeEmptyDOMElement()
		);
		expect(within(listHeader).queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument();
		forEach(currentFolder.children.nodes, (child) => {
			expect(screen.getByText((child as Node).name)).toBeVisible();
		});
	});

	test('intersectionObserver trigger the fetchMore function to load more elements when observed element is intersected', async () => {
		const currentFolder = populateFolder(NODES_LOAD_LIMIT + Math.floor(NODES_LOAD_LIMIT / 2));

		const childrenResolver: FolderResolvers['children'] = (parent, args) => {
			if (args.page_token !== undefined && args.page_token !== null) {
				return populateNodePage(currentFolder.children.nodes.slice(NODES_LOAD_LIMIT));
			}
			return populateNodePage(currentFolder.children.nodes.slice(0, NODES_LOAD_LIMIT));
		};
		const mocks = {
			Folder: {
				children: childrenResolver
			},
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode(currentFolder)
			}
		} satisfies Partial<Resolvers>;

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// this is the loading refresh icon
		expect(screen.getByTestId('list-header')).toContainElement(
			screen.getByTestId(ICON_REGEXP.queryLoading)
		);
		expect(
			within(screen.getByTestId('list-header')).getByTestId(ICON_REGEXP.queryLoading)
		).toBeVisible();
		await waitForElementToBeRemoved(
			within(screen.getByTestId('list-header')).queryByTestId(ICON_REGEXP.queryLoading)
		);
		// wait the rendering of the first item
		await screen.findByTestId(`node-item-${(currentFolder.children.nodes[0] as Node).id}`);
		expect(
			screen.getByTestId(
				`node-item-${(currentFolder.children.nodes[NODES_LOAD_LIMIT - 1] as Node).id}`
			)
		).toBeVisible();
		// the loading icon should be still visible at the bottom of the list because we have load the max limit of items per page
		expect(screen.getByTestId(ICON_REGEXP.queryLoading)).toBeVisible();

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
		expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument();
	});
});
