/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { forEach, map, findIndex, last } from 'lodash';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import { NODES_LOAD_LIMIT, NODES_SORT_DEFAULT } from '../constants';
import { ACTION_REGEXP, COLORS, ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFolder, populateNodePage, populateNodes, sortNodes } from '../mocks/mockUtils';
import { renameNode, setup, selectNodes, triggerListLoadMore } from '../tests/utils';
import { FolderResolvers, Resolvers } from '../types/graphql/resolvers-types';
import { File, Folder } from '../types/graphql/types';
import { mockGetNode, mockGetPath, mockTrashNodes, mockUpdateNode } from '../utils/resolverMocks';

jest.mock<typeof import('./components/Displayer')>('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): React.JSX.Element => (
		<div data-testid="map">
			{props.translationKey}:{props.icons}
		</div>
	)
}));

jest.mock<typeof import('./components/VirtualizedNodeListItem')>(
	'./components/VirtualizedNodeListItem'
);

describe('Rename', () => {
	describe('Selection mode', () => {
		test('Rename change node name and update the content of the folder, showing the element at its new position', async () => {
			const currentFolder = populateFolder();
			currentFolder.children = populateNodePage(populateNodes(5, 'Folder'));
			sortNodes(currentFolder.children.nodes, NODES_SORT_DEFAULT);
			// enable permission to rename
			forEach(currentFolder.children.nodes, (mockedNode) => {
				if (mockedNode) {
					mockedNode.permissions.can_write_file = true;
					mockedNode.permissions.can_write_folder = true;
					mockedNode.parent = currentFolder;
				}
			});

			// the element to rename is the first of the list. To assure that it changes position,
			// the new name of the node is going to be the name of the last ordered element with the timestamp at the end
			const timestamp = Date.now();
			const element = currentFolder.children.nodes[0]!;
			const newName = `${
				currentFolder.children.nodes[currentFolder.children.nodes.length - 1]!.name
			}-${timestamp}`;

			const newPos = currentFolder.children.nodes.length - 1;

			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
				},
				Mutation: {
					updateNode: mockUpdateNode({
						...element,
						name: newName
					})
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			// wait for the load to be completed
			await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

			// activate selection mode by selecting items
			await selectNodes([element.id], user);
			// check that all wanted items are selected
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
			// check that the rename action becomes visible
			await renameNode(newName, user);
			// wait for the modal to be closed
			expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
			// check the node. It should have the new name and be at the end of the updated list
			const nodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
			expect(nodeItem).toBeVisible();
			expect(within(nodeItem).getByText(newName)).toBeVisible();
			const nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(nodes).toHaveLength(currentFolder.children.nodes.length);
			expect(nodes[newPos]).toBe(screen.getByTestId(SELECTORS.nodeItem(element.id)));
			// selection mode is de-activate
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();
		});
	});

	describe('Contextual menu actions', () => {
		test('Rename change node name and update the content of the folder, showing the element at its new position', async () => {
			const currentFolder = populateFolder();
			currentFolder.children = populateNodePage(populateNodes(5, 'Folder'));
			// enable permission to rename
			forEach(currentFolder.children.nodes, (mockedNode) => {
				if (mockedNode) {
					mockedNode.permissions.can_write_file = true;
					mockedNode.permissions.can_write_folder = true;
					mockedNode.parent = currentFolder;
				}
			});
			sortNodes(currentFolder.children.nodes, NODES_SORT_DEFAULT);

			// the element to rename is the first of the list. To assure that it changes position,
			// the new name of the node is going to be the name of the last ordered element with the timestamp at the end
			const timestamp = Date.now();
			const element = currentFolder.children.nodes[0]!;
			const newName = `${
				currentFolder.children.nodes[currentFolder.children.nodes.length - 1]!.name
			}-${timestamp}`;

			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
				},
				Mutation: {
					updateNode: mockUpdateNode({
						...element,
						name: newName
					})
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			// wait for the load to be completed
			await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

			// right click to open contextual menu
			const nodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
			// open context menu
			await user.rightClick(nodeItem);
			await renameNode(newName, user);
			// wait for the modal to be closed
			expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
			// check the new item. It has the new name and its located as last element of the updated list
			const updatedNodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
			expect(updatedNodeItem).toBeVisible();
			expect(within(updatedNodeItem).getByText(newName)).toBeVisible();
			const nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(nodes).toHaveLength(currentFolder.children.nodes.length);
			expect(nodes[nodes.length - 1]).toBe(updatedNodeItem);
			// contextual menu is closed
			expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
		});

		test('Rename a node to an unordered position does not change cursor for pagination', async () => {
			// folder with 3 pages
			const currentFolder = populateFolder();
			currentFolder.children = populateNodePage(populateNodes(NODES_LOAD_LIMIT * 3, 'File'));
			sortNodes(currentFolder.children.nodes, NODES_SORT_DEFAULT);
			// enable permission to rename
			currentFolder.permissions.can_write_folder = true;
			forEach(currentFolder.children.nodes, (mockedNode) => {
				if (mockedNode) {
					mockedNode.permissions.can_write_file = true;
					mockedNode.permissions.can_write_folder = true;
					mockedNode.parent = {
						...currentFolder,
						children: {
							nodes: [],
							__typename: 'NodePage',
							page_token: null
						}
					} satisfies Folder;
				}
			});

			// the element to rename is the first of the list. New position is third position of third page
			const timestamp = Date.now();
			const element = currentFolder.children.nodes[0]!;
			const newName = `${
				currentFolder.children.nodes[NODES_LOAD_LIMIT * 2 + 2]!.name
			}-${timestamp}`;

			// the cursor is last element of first page and does not change after rename
			const firstCursor = currentFolder.children.nodes[NODES_LOAD_LIMIT - 1]!;

			// second page does not change after rename
			const secondPage = currentFolder.children.nodes.slice(
				NODES_LOAD_LIMIT,
				NODES_LOAD_LIMIT * 2
			) as (File | Folder)[];

			const secondCursor = secondPage[secondPage.length - 1];

			// third page has also the renamed element
			let thirdPage = currentFolder.children.nodes.slice(NODES_LOAD_LIMIT * 2) as (File | Folder)[];
			// add the renamed node at third position
			thirdPage.splice(2, 0, { ...element, name: newName });
			// then resize third page to contain only NODES_LOAD_LIMIT elements
			thirdPage = thirdPage.slice(0, NODES_LOAD_LIMIT);

			const thirdCursor = thirdPage[thirdPage.length - 1];

			const childrenResolver: FolderResolvers['children'] = (parent, args) => {
				switch (args.page_token) {
					case 'page2':
						return populateNodePage(secondPage, NODES_LOAD_LIMIT, 'page3');
					case 'page3':
						return populateNodePage(thirdPage, NODES_LOAD_LIMIT, 'page4');
					case 'page4':
						return populateNodePage(
							currentFolder.children.nodes.slice(
								findIndex(currentFolder.children.nodes, thirdCursor) + 1
							)
						);
					default:
						return populateNodePage(
							currentFolder.children.nodes.slice(0, NODES_LOAD_LIMIT),
							NODES_LOAD_LIMIT,
							'page2'
						);
				}
			};
			const mocks = {
				Folder: {
					children: childrenResolver
				},
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({
						getChildren: Array(4).fill(currentFolder),
						getPermissions: [currentFolder]
					})
				},
				Mutation: {
					updateNode: mockUpdateNode({
						...element,
						name: newName
					})
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			// wait for the load to be completed
			const listHeader = screen.getByTestId(SELECTORS.listHeader);
			await waitForElementToBeRemoved(within(listHeader).queryByTestId(ICON_REGEXP.queryLoading));
			let nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(screen.getByTestId(SELECTORS.nodeItem(firstCursor.id))).toBe(nodes[nodes.length - 1]);
			// right click to open contextual menu
			const nodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
			// open context menu
			await user.rightClick(nodeItem);
			await renameNode(newName, user);
			// check the new item. It has the new name, and it's located as last element of the updated list
			let updatedNodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
			expect(within(updatedNodeItem).getByText(newName)).toBeVisible();
			nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(nodes).toHaveLength(NODES_LOAD_LIMIT);
			expect(nodes[nodes.length - 1]).toBe(updatedNodeItem);
			expect(screen.getByTestId(SELECTORS.nodeItem(firstCursor.id))).toBe(nodes[nodes.length - 2]);
			// trigger the load of a new page
			triggerListLoadMore();
			// wait for the load to complete (last element of second page is loaded)
			await screen.findByTestId(SELECTORS.nodeItem(secondPage[secondPage.length - 1].id));
			// updated item is still last element
			nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(nodes).toHaveLength(NODES_LOAD_LIMIT * 2);
			expect(nodes[nodes.length - 1]).toBe(updatedNodeItem);
			expect(screen.getByTestId(SELECTORS.nodeItem(secondCursor.id))).toBe(nodes[nodes.length - 2]);
			// trigger the load of a new page
			triggerListLoadMore();
			// wait for the load to complete (last element of third page is loaded)
			await screen.findByTestId(SELECTORS.nodeItem(last(thirdPage)!.id));
			nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
			// updated node is now at its ordered position (third position of third page, but considering that first page has 1 less element now)
			expect(nodes).toHaveLength(NODES_LOAD_LIMIT * 3 - 1);
			updatedNodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
			expect(findIndex(nodes, (node) => node === updatedNodeItem)).toBe(
				NODES_LOAD_LIMIT * 2 + 2 - 1
			);
			// last element is last node of third page
			expect(screen.getByTestId(SELECTORS.nodeItem(thirdPage[thirdPage.length - 1].id))).toBe(
				nodes[nodes.length - 1]
			);
			// trigger the load of a new page
			triggerListLoadMore();
			// wait for the load to complete (last element of children is loaded)
			await screen.findByTestId(
				SELECTORS.nodeItem(
					currentFolder.children.nodes[currentFolder.children.nodes.length - 1]!.id
				)
			);
			nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
			// number of elements shown is the total number of children
			expect(nodes).toHaveLength(currentFolder.children.nodes.length);
			// load more icon is not visible
			expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument();
		});

		test('Rename of last ordered node to unordered update cursor to be last ordered node and trigger load of the next page with the new cursor', async () => {
			const currentFolder = populateFolder();
			currentFolder.children = populateNodePage(
				sortNodes(populateNodes(NODES_LOAD_LIMIT * 2, 'File'), NODES_SORT_DEFAULT) as (
					| File
					| Folder
				)[]
			);
			forEach(currentFolder.children.nodes, (mockedNode) => {
				if (mockedNode) {
					mockedNode.permissions.can_write_file = true;
					mockedNode.permissions.can_write_folder = true;
					mockedNode.parent = currentFolder;
				}
			});
			const firstPage = currentFolder.children.nodes.slice(0, NODES_LOAD_LIMIT) as (
				| File
				| Folder
			)[];
			const secondPage = currentFolder.children.nodes.slice(NODES_LOAD_LIMIT) as (File | Folder)[];

			const nodeToRename = firstPage[firstPage.length - 1];
			const newName = `${last(secondPage)!.name}-renamed`;

			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					// use default children resolver to split children in pages
					getNode: mockGetNode({
						getChildren: [currentFolder, currentFolder],
						getPermissions: [currentFolder]
					})
				},
				Mutation: {
					updateNode: mockUpdateNode({
						...nodeToRename,
						name: newName
					})
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(firstPage[0].name);
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getByText(nodeToRename.name)).toBeVisible();
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();
			// rename node to put it in the unordered list
			await user.rightClick(screen.getByText(nodeToRename.name));
			await renameNode(newName, user);
			expect(screen.queryByRole('button', { name: ACTION_REGEXP.rename })).not.toBeInTheDocument();
			await screen.findByText(newName);
			expect(screen.queryByText(nodeToRename.name)).not.toBeInTheDocument();
			expect(screen.getByText(newName)).toBeVisible();
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();
			triggerListLoadMore();
			await screen.findByText(secondPage[0].name);
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getByText(newName)).toBeVisible();
			const nodeItems = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(nodeItems).toHaveLength(currentFolder.children.nodes.length);
			expect(screen.getByTestId(SELECTORS.nodeItem(nodeToRename.id))).toBe(last(nodeItems));
		});

		test('Rename of last ordered node to unordered and move to trash of all remaining ordered nodes triggers load of next page', async () => {
			const currentFolder = populateFolder();
			currentFolder.children = populateNodePage(
				sortNodes(populateNodes(NODES_LOAD_LIMIT * 2, 'File'), NODES_SORT_DEFAULT) as (
					| File
					| Folder
				)[]
			);
			forEach(currentFolder.children.nodes, (mockedNode) => {
				if (mockedNode) {
					mockedNode.permissions.can_write_file = true;
					mockedNode.permissions.can_write_folder = true;
					mockedNode.parent = currentFolder;
				}
			});
			const firstPage = currentFolder.children.nodes.slice(0, NODES_LOAD_LIMIT) as (
				| File
				| Folder
			)[];
			const secondPage = currentFolder.children.nodes.slice(NODES_LOAD_LIMIT) as (File | Folder)[];

			const nodeToRename = firstPage[firstPage.length - 1];
			const newName = `${last(secondPage)!.name}-renamed`;

			const nodesToTrash = map(firstPage.slice(0, firstPage.length - 1), (node) => node.id);

			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					// use default children resolver to split children in pages
					getNode: mockGetNode({
						getChildren: [currentFolder, currentFolder],
						getPermissions: [currentFolder]
					})
				},
				Mutation: {
					updateNode: mockUpdateNode({
						...nodeToRename,
						name: newName
					}),
					trashNodes: mockTrashNodes(nodesToTrash)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(firstPage[0].name);
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getByText(nodeToRename.name)).toBeVisible();
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();
			// rename node to put it in the unordered list
			await user.rightClick(screen.getByText(nodeToRename.name));
			await renameNode(newName, user);
			await screen.findByText(newName);
			expect(screen.getByText(newName)).toBeVisible();
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();
			// select all ordered items (all but the renamed node)
			await selectNodes(nodesToTrash, user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(firstPage.length - 1);
			expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
			const trashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(trashAction).toBeVisible();
			expect(trashAction).toHaveStyle({
				color: COLORS.text.regular
			});
			await user.click(trashAction);
			await screen.findByText(/Item moved to trash/i);
			triggerListLoadMore();
			await screen.findByText(secondPage[0].name);
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
			expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument();
			expect(screen.getByText(newName)).toBeInTheDocument();
		});
	});
});
