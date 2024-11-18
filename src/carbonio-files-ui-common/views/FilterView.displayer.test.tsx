/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { map } from 'lodash';
import { Route } from 'react-router-dom';

import FilterView from './FilterView';
import { FILTER_TYPE, INTERNAL_PATH } from '../constants';
import { DISPLAYER_EMPTY_MESSAGE, SELECTORS } from '../constants/test';
import { populateFolder, populateNodes, populateParents } from '../mocks/mockUtils';
import { buildBreadCrumbRegExp, moveNode, setup } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { Folder } from '../types/graphql/types';
import { mockFindNodes, mockGetNode, mockGetPath, mockMoveNodes } from '../utils/resolverMocks';

jest.mock<typeof import('./components/VirtualizedNodeListItem')>(
	'./components/VirtualizedNodeListItem'
);

describe('Filter View', () => {
	describe('Displayer', () => {
		test('Single click on a node opens the details tab on displayer', async () => {
			const nodes = populateNodes(10);
			const node = nodes[0];
			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes),
					getNode: mockGetNode({ getNode: [node] })
				}
			} satisfies Partial<Resolvers>;
			const { getByTextWithMarkup, user } = setup(
				<Route path={`/:view/:filter?`}>
					<FilterView />
				</Route>,
				{
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`],
					mocks
				}
			);
			// wait the content to be rendered
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			await screen.findAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				nodes.length
			);
			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await waitForElementToBeRemoved(screen.queryByText(DISPLAYER_EMPTY_MESSAGE));
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId(SELECTORS.displayer);
			await within(displayer).findAllByText(node.name);
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			expect(getByTextWithMarkup(buildBreadCrumbRegExp(node.name))).toBeVisible();
		});

		test('Move action does not close the displayer if node is not removed from the main list', async () => {
			const nodes = populateNodes(2);
			const node = nodes[0];
			const parentNode = populateFolder();
			node.parent = parentNode;
			const { path: parentPath } = populateParents(parentNode);
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			(node.parent as Folder).children.nodes.push(destinationFolder);
			node.parent.permissions.can_write_folder = true;
			node.parent.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.flagged = true;
			const path = [...parentPath, node];
			const pathUpdated = [...parentPath, destinationFolder, node];
			const pathResponse = [path, pathUpdated];
			const mocks = {
				Query: {
					findNodes: mockFindNodes(nodes),
					getNode: mockGetNode({ getNode: [node], getChildren: [parentNode, destinationFolder] }),
					getPath: mockGetPath(...pathResponse, parentPath, [...parentPath, destinationFolder])
				},
				Mutation: {
					moveNodes: mockMoveNodes([node])
				}
			} satisfies Partial<Resolvers>;

			const { getByTextWithMarkup, queryByTextWithMarkup, findByTextWithMarkup, user } = setup(
				<Route path={`/:view/:filter?`}>
					<FilterView />
				</Route>,
				{
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`],
					mocks
				}
			);
			// wait the content to be rendered
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			await screen.findAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(nodes).not.toBeNull();
			expect(nodes.length).toBeGreaterThan(0);

			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);

			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId(SELECTORS.displayer);
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			expect(getByTextWithMarkup(buildBreadCrumbRegExp(node.name))).toBeVisible();
			const showPathButton = screen.getByRole('button', { name: /show path/i });
			expect(showPathButton).toBeVisible();
			await user.click(showPathButton);
			await within(displayer).findByText(node.parent.name);
			const fullPathOriginalRegexp = buildBreadCrumbRegExp(...map(path, (parent) => parent.name));
			await findByTextWithMarkup(fullPathOriginalRegexp);
			expect(getByTextWithMarkup(fullPathOriginalRegexp)).toBeVisible();
			// right click to open contextual menu
			const nodeToMoveItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
			await user.rightClick(nodeToMoveItem);
			await moveNode(destinationFolder, user);
			await screen.findByText(/item moved/i);
			const fullPathUpdatedItem = await findByTextWithMarkup(
				buildBreadCrumbRegExp(...map(pathUpdated, (parent) => parent.name))
			);
			// old breadcrumb is not visible anymore
			expect(queryByTextWithMarkup(fullPathOriginalRegexp)).not.toBeInTheDocument();
			// updated breadcrumb is visible instead
			expect(fullPathUpdatedItem).toBeVisible();
			expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				nodes.length
			);
			expect(within(screen.getByTestId(SELECTORS.list())).getByText(node.name)).toBeVisible();
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
		});
	});
});
