/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import { forEach, map } from 'lodash';
import { graphql } from 'msw';
import { Link, Route, Switch } from 'react-router-dom';

import FilterView from './FilterView';
import FolderView from './FolderView';
import { ACTION_IDS } from '../../constants';
import { CreateOption, CreateOptionsReturnType } from '../../hooks/useCreateOptions';
import server from '../../mocks/server';
import { FILTER_TYPE, INTERNAL_PATH, NODES_LOAD_LIMIT } from '../constants';
import { ICON_REGEXP, SELECTORS } from '../constants/test';
import handleFindNodesRequest from '../mocks/handleFindNodesRequest';
import { populateFolder, populateNode, populateNodes } from '../mocks/mockUtils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { FindNodesQuery, FindNodesQueryVariables } from '../types/graphql/types';
import { mockFindNodes, mockFlagNodes, mockGetNode, mockGetPath } from '../utils/resolverMocks';
import { selectNodes, setup, triggerLoadMore } from '../utils/testUtils';

let mockedCreateOptions: CreateOption[];

beforeEach(() => {
	mockedCreateOptions = [];
});

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsReturnType => ({
		setCreateOptions: (...options): ReturnType<CreateOptionsReturnType['setCreateOptions']> => {
			mockedCreateOptions = options;
		},
		removeCreateOptions: () => undefined
	})
}));

describe('Filter view', () => {
	test('No url param render a "Missing filter" message', async () => {
		const mockedRequestHandler = jest.fn(handleFindNodesRequest);
		server.use(
			graphql.query<FindNodesQuery, FindNodesQueryVariables>('findNodes', mockedRequestHandler)
		);
		setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
			initialRouterEntries: [`${INTERNAL_PATH.FILTER}/`]
		});
		await screen.findByTestId(SELECTORS.missingFilter);
		expect(screen.getByText(/it looks like there's nothing here/i)).toBeVisible();
		expect(mockedRequestHandler).not.toHaveBeenCalled();
	});

	test('Create folder option is always disabled', async () => {
		setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
			initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
		});
		await screen.findByText(/view files and folders/i);
		expect(map(mockedCreateOptions, (createOption) => createOption.action({}))).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: ACTION_IDS.CREATE_FOLDER, disabled: true })
			])
		);
	});

	test('first access to a filter show loading state and than show nodes', async () => {
		const nodes = populateNodes();
		const mocks = {
			Query: {
				findNodes: mockFindNodes(nodes)
			}
		} satisfies Partial<Resolvers>;

		setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
			initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`],
			mocks
		});

		const listHeader = screen.getByTestId(SELECTORS.listHeader);
		expect(within(listHeader).getByTestId(ICON_REGEXP.queryLoading)).toBeVisible();
		await waitFor(() => expect(screen.getByTestId(SELECTORS.list())).not.toBeEmptyDOMElement());
		await screen.findByText(nodes[0].name);
		expect(within(listHeader).queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument();
		forEach(nodes, (node) => {
			expect(screen.getByTestId(SELECTORS.nodeItem(node.id))).toBeInTheDocument();
			expect(screen.getByTestId(SELECTORS.nodeItem(node.id))).toHaveTextContent(node.name);
		});
	});

	test('intersectionObserver trigger the fetchMore function to load more elements when observed element is intersected', async () => {
		const currentFilter = populateNodes(NODES_LOAD_LIMIT + Math.floor(NODES_LOAD_LIMIT / 2));

		const mocks = {
			Query: {
				findNodes: mockFindNodes(
					currentFilter.slice(0, NODES_LOAD_LIMIT),
					currentFilter.slice(NODES_LOAD_LIMIT)
				)
			}
		} satisfies Partial<Resolvers>;

		setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
			initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`],
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
		await screen.findByTestId(SELECTORS.nodeItem(currentFilter[0].id));
		expect(
			screen.getByTestId(SELECTORS.nodeItem(currentFilter[NODES_LOAD_LIMIT - 1].id))
		).toBeVisible();
		// the loading icon should be still visible at the bottom of the list because we have load the max limit of items per page
		expect(screen.getByTestId(ICON_REGEXP.queryLoading)).toBeVisible();

		// elements after the limit should not be rendered
		expect(screen.queryByTestId(currentFilter[NODES_LOAD_LIMIT].id)).not.toBeInTheDocument();
		await triggerLoadMore();

		// wait for the response
		await screen.findByTestId(SELECTORS.nodeItem(currentFilter[NODES_LOAD_LIMIT].id));

		// now all elements are loaded so last node and first node should be visible and no loading icon should be rendered
		expect(
			screen.getByTestId(SELECTORS.nodeItem(currentFilter[currentFilter.length - 1].id))
		).toBeVisible();
		expect(screen.getByTestId(SELECTORS.nodeItem(currentFilter[0].id))).toBeVisible();
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFilter.length
		);
		expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument();
	});

	test('filter is re-fetched on subsequent navigations', async () => {
		const nodes = populateNodes(1);
		const currentFolder = populateFolder();
		const node = populateNode();
		node.flagged = false;
		currentFolder.children.nodes.push(node);

		const mocks = {
			Query: {
				findNodes: mockFindNodes(nodes, [...nodes, node]),
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
			},
			Mutation: {
				flagNodes: mockFlagNodes([node.id])
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(
			<div>
				<Link
					to={{
						pathname: '/',
						search: `?folder=${currentFolder.id}`
					}}
				>
					Go to folder
				</Link>
				<Link to={`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`}>Go to filter</Link>
				<Switch>
					<Route path={`/:view/:filter?`} component={FilterView} />
					<Route path="/" component={FolderView} />
				</Switch>
			</div>,
			{ initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`], mocks }
		);

		// filter list, first load to write data in cache
		await screen.findByTestId(SELECTORS.nodeItem(nodes[0].id));
		// only 1 item load
		expect(screen.getByTestId(SELECTORS.nodeItem(), { exact: false })).toBeInTheDocument();
		// navigate to folder
		await user.click(screen.getByRole('link', { name: 'Go to folder' }));
		// folder list, first load
		await screen.findByTestId(SELECTORS.nodeItem(node.id));
		expect(screen.getByTestId(SELECTORS.nodeItem(), { exact: false })).toBeInTheDocument();
		// flag the node through the hover bar
		await user.click(screen.getByTestId(ICON_REGEXP.flag));
		await screen.findByTestId(ICON_REGEXP.flagged);
		// navigate to filter again
		await user.click(screen.getByRole('link', { name: 'Go to filter' }));
		// filter list, second load but with a new network request. Wait for loading icon to be removed
		await screen.findByText(node.name);
		const nodesItems = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
		expect(nodesItems).toHaveLength(2);
		expect(screen.getByTestId(SELECTORS.nodeItem(node.id))).toBe(nodesItems[1]);
	});

	describe('Selection mode', () => {
		test('if there is no element selected, all actions are visible and disabled', async () => {
			const nodes = populateNodes(10);
			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
			});
			await screen.findByText(nodes[0].name);
			expect(screen.getByText(nodes[0].name)).toBeVisible();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			await selectNodes([nodes[0].id], user);
			// check that all wanted items are selected
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			expect(screen.getByText(/select all/i)).toBeVisible();
			// deselect node. Selection mode remains active
			await selectNodes([nodes[0].id], user);
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			expect(screen.getAllByTestId(SELECTORS.uncheckedAvatar)).toHaveLength(nodes.length);
			expect(screen.getByText(/select all/i)).toBeVisible();

			expect(screen.queryByTestId(ICON_REGEXP.moveToTrash)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.rename)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.copy)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.move)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.flag)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.unflag)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.download)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.openDocument)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.restore)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.deletePermanently)).not.toBeInTheDocument();

			const arrowBack = screen.getByTestId(ICON_REGEXP.exitSelectionMode);
			expect(arrowBack).toBeVisible();
			await user.click(arrowBack);
			expect(screen.queryByTestId(SELECTORS.uncheckedAvatar)).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			expect(screen.queryByText(/select all/i)).not.toBeInTheDocument();
		});
	});
});
