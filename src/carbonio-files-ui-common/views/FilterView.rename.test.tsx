/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import { forEach, map, find } from 'lodash';
import { Route } from 'react-router-dom';

import FilterView from './FilterView';
import { FILTER_TYPE, INTERNAL_PATH, NODES_LOAD_LIMIT, NODES_SORT_DEFAULT } from '../constants';
import { ACTION_REGEXP, COLORS, ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFile, populateFolder, populateNodes, sortNodes } from '../mocks/mockUtils';
import { generateError, renameNode, setup, selectNodes } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import {
	File,
	Folder,
	GetChildrenDocument,
	GetChildrenQuery,
	GetChildrenQueryVariables
} from '../types/graphql/types';
import {
	getChildrenVariables,
	mockErrorResolver,
	mockFindNodes,
	mockGetNode,
	mockUpdateNode
} from '../utils/resolverMocks';
import { addNodeInSortedList } from '../utils/utils';

jest.mock<typeof import('./components/VirtualizedNodeListItem')>(
	'./components/VirtualizedNodeListItem'
);

describe('Filter View', () => {
	describe('Rename', () => {
		describe('Selection Mode', () => {
			test('Rename is hidden when multiple files are selected', async () => {
				const nodes = [];
				// enable permission to rename
				for (let i = 0; i < 2; i += 1) {
					const node = populateFile();
					node.permissions.can_write_file = true;
					nodes.push(node);
				}

				const mocks = {
					Query: {
						findNodes: mockFindNodes(nodes)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

				// activate selection mode by selecting items
				await selectNodes(
					map(nodes, (node) => node.id),
					user
				);
				// check that all wanted items are selected
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodes.length);

				expect(screen.queryByTestId(ICON_REGEXP.rename)).not.toBeInTheDocument();

				const moreIconButton = screen.queryByTestId(ICON_REGEXP.moreVertical);
				if (moreIconButton) {
					await user.click(moreIconButton);
					// wait for trash action to check that popper is open
					const trashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
					expect(trashAction).toHaveStyle({
						color: COLORS.text.regular
					});
					expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
				}
			});

			test('Rename is hidden if node does not have permissions', async () => {
				// disable permission to rename
				const node = populateFile();
				node.permissions.can_write_file = false;

				const mocks = {
					Query: {
						findNodes: mockFindNodes([node])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

				// activate selection mode by selecting items
				await selectNodes([node.id], user);
				// check that all wanted items are selected
				expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();

				expect(screen.queryByTestId(ICON_REGEXP.rename)).not.toBeInTheDocument();

				const moreIconButton = screen.queryByTestId(ICON_REGEXP.moreVertical);
				if (moreIconButton) {
					await user.click(moreIconButton);
					await screen.findByTestId(SELECTORS.dropdownList);
					expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
				}
			});

			test('Rename operation fail shows an error in the modal and does not close it', async () => {
				const nodes = populateNodes(3, 'Folder');
				// enable permission to rename
				forEach(nodes, (mockedNode) => {
					mockedNode.permissions.can_write_folder = true;
					mockedNode.flagged = true;
				});
				sortNodes(nodes, NODES_SORT_DEFAULT);

				// rename first element with name of the second one
				const element = nodes[0];
				const newName = nodes[1].name;

				const mocks = {
					Query: {
						findNodes: mockFindNodes(nodes)
					},
					Mutation: {
						updateNode: mockErrorResolver(generateError('Error! Name already assigned'))
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

				// activate selection mode by selecting items
				await selectNodes([element.id], user);
				// check that all wanted items are selected
				expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
				expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
				await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
				await renameNode(newName, user);
				// following text is in the modal and in snackbar
				await waitFor(() =>
					expect(screen.getAllByText(/Error! Name already assigned/)).toHaveLength(2)
				);
				// close snackbar
				act(() => {
					// run timers of snackbar
					jest.runOnlyPendingTimers();
				});
				// when find only 1 occurrence means that snackbar is hidden
				expect(screen.getByText(/Error! Name already assigned/)).toBeVisible();
				const inputField = screen.getByRole('textbox');
				expect(inputField).toBeVisible();
				expect(inputField).toHaveValue(newName);
			});

			test('Rename change node name and leave node at same position in the list', async () => {
				const nodes = populateNodes(5, 'Folder');
				// enable permission to rename
				forEach(nodes, (mockedNode) => {
					mockedNode.permissions.can_write_folder = true;
					mockedNode.flagged = true;
				});
				sortNodes(nodes, NODES_SORT_DEFAULT);

				// the element to rename is the first of the list
				const element = nodes[0];
				const lastElementName = nodes[nodes.length - 1].name;
				const newName = lastElementName.substring(0, lastElementName.length - 1);
				const nodeWithNewName = { ...element, name: newName };

				const mocks = {
					Query: {
						findNodes: mockFindNodes(nodes),
						getNode: mockGetNode({ getNode: [nodeWithNewName] })
					},
					Mutation: {
						updateNode: mockUpdateNode(nodeWithNewName)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

				// activate selection mode by selecting items
				await selectNodes([element.id], user);
				// check that all wanted items are selected
				expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
				expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
				await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
				screen.getByTestId(SELECTORS.nodeItem(element.id));
				await renameNode(newName, user);
				// check the node. It should have the new name and be at same position
				const nodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
				expect(nodeItem).toBeVisible();
				expect(within(nodeItem).getByText(newName)).toBeVisible();
				const nodeItems = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
				expect(nodeItems).toHaveLength(nodes.length);
				expect(nodeItems[0]).toBe(nodeItem);
				// selection mode is de-activate
				expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
				const list = screen.getByTestId(SELECTORS.list());
				expect(within(list).queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();
			});
		});

		describe('Contextual Menu', () => {
			test('right click on node open the contextual menu for the node, closing a previously opened one. Left click close it', async () => {
				const nodes = populateNodes(2);
				// set the node not flagged so that we can findNodes by flag action in the contextual menu of first node
				nodes[0].flagged = false;
				// set the second node flagged so that we can findNodes by unflag action in the contextual menu of second node
				nodes[1].flagged = true;

				const mocks = {
					Query: {
						findNodes: mockFindNodes(nodes)
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

				// right click to open contextual menu
				const node1Item = screen.getByTestId(SELECTORS.nodeItem(nodes[0].id));
				const node2Item = screen.getByTestId(SELECTORS.nodeItem(nodes[1].id));
				await user.rightClick(node1Item);
				// check that the flag action becomes visible (contextual menu of first node)
				const flagAction1 = await screen.findByText(ACTION_REGEXP.flag);
				act(() => {
					// run timers of dropdown
					jest.runOnlyPendingTimers();
				});
				expect(flagAction1).toBeVisible();
				// right click on second node
				await user.rightClick(node2Item);
				// check that the unflag action becomes visible (contextual menu of second node)
				const unflagAction2 = await screen.findByText(ACTION_REGEXP.unflag);
				act(() => {
					// run timers of dropdown
					jest.runOnlyPendingTimers();
				});
				expect(unflagAction2).toBeVisible();
				// check that the flag action becomes invisible (contextual menu of first node is closed)
				expect(flagAction1).not.toBeInTheDocument();
				// left click close all the contextual menu
				await user.click(node2Item);
				expect(unflagAction2).not.toBeInTheDocument();
				expect(flagAction1).not.toBeInTheDocument();
			});

			test('Rename is hidden if node does not have permissions', async () => {
				const node = populateFile();
				node.permissions.can_write_file = false;

				const mocks = {
					Query: {
						findNodes: mockFindNodes([node])
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

				// right click to open contextual menu
				const nodeItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
				await user.rightClick(nodeItem);
				// wait for copy action to check that popper is open
				await screen.findByText(ACTION_REGEXP.copy);
				expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
			});

			test('Rename change node name and leave node at same position in the list', async () => {
				const nodes = populateNodes(5, 'File');
				// enable permission to rename
				forEach(nodes, (mockedNode) => {
					mockedNode.permissions.can_write_file = true;
					mockedNode.flagged = true;
				});
				sortNodes(nodes, NODES_SORT_DEFAULT);

				// the element to rename is the second of the list
				const element = nodes[1];
				const lastElementName = nodes[nodes.length - 1].name;
				const newName = lastElementName.substring(0, lastElementName.length - 1);
				const nodeWithNewName = { ...element, name: newName } satisfies File | Folder;

				const mocks = {
					Query: {
						findNodes: mockFindNodes(nodes),
						getNode: mockGetNode({ getNode: [nodeWithNewName] })
					},
					Mutation: {
						updateNode: mockUpdateNode(nodeWithNewName)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

				// right click to open contextual menu
				const nodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
				// open context menu
				await user.rightClick(nodeItem);
				await renameNode(newName, user);
				// check the new item. It has the new name, and it's located at same position
				const updatedNodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
				expect(updatedNodeItem).toBeVisible();
				expect(within(updatedNodeItem).getByText(newName)).toBeVisible();
				const nodeItems = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
				expect(nodeItems).toHaveLength(nodes.length);
				// element should be the second last in the list
				expect(nodeItems[1]).toBe(updatedNodeItem);
				// contextual menu is closed
				expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
			});

			test('Rename a node already loaded in a folder change position of the node in the folder from ordered to unordered', async () => {
				// nodes shown in the filter, only one page
				const currentFilter = populateNodes(NODES_LOAD_LIMIT - 1, 'Folder');
				// the element to rename is the first of the list
				// its new position is going to be the same for the filter view,
				// while in the parent folder it will be positioned in the unordered elements at the end of the list
				const timestamp = Date.now();
				const element = currentFilter[0];
				const newName = `${element.name}-${timestamp}`;
				// nodes of the folder already cached from a previous navigation (1 page of n)
				const parentFolder = populateFolder(NODES_LOAD_LIMIT - 1);
				// put element as first node of the folder
				parentFolder.children.nodes.unshift(element);
				// enable permission to rename
				parentFolder.permissions.can_write_folder = true;
				element.permissions.can_write_folder = true;
				element.parent = parentFolder;

				// prepare the cache with the parent folder as if already loaded
				global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
					query: GetChildrenDocument,
					variables: getChildrenVariables(parentFolder.id),
					data: {
						getNode: parentFolder
					}
				});

				const nodeWithNewName = { ...element, name: newName, parent: parentFolder } satisfies
					| File
					| Folder;
				const newPosition = addNodeInSortedList(
					parentFolder.children.nodes,
					nodeWithNewName,
					NODES_SORT_DEFAULT
				);

				const mocks = {
					Query: {
						findNodes: mockFindNodes(currentFilter),
						getNode: mockGetNode({ getNode: [nodeWithNewName] })
					},
					Mutation: {
						updateNode: mockUpdateNode(nodeWithNewName)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

				// check the position of the node to update in the cached parent folder
				// load two pages even if only one should be written in cache
				let parentFolderData = global.apolloClient.cache.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GetChildrenDocument,
					variables: getChildrenVariables(parentFolder.id, NODES_LOAD_LIMIT * 2)
				});
				expect(parentFolderData?.getNode).toBeDefined();
				expect(parentFolderData?.getNode).not.toBeNull();
				expect((parentFolderData?.getNode as Folder).children.nodes).toHaveLength(NODES_LOAD_LIMIT);
				expect((parentFolderData?.getNode as Folder).children.nodes[0]!.id).toBe(element.id);
				// right click to open contextual menu
				const nodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
				// open context menu
				await user.rightClick(nodeItem);
				await renameNode(newName, user);
				// check the new item. It has the new name, and it is at same position in the filter list
				const updatedNodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
				expect(updatedNodeItem).toBeVisible();
				expect(within(updatedNodeItem).getByText(newName)).toBeVisible();
				const nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
				expect(nodes).toHaveLength(currentFilter.length);
				expect(nodes[0]).toBe(updatedNodeItem);
				// check that in the parent folder the node has changed its position to last position
				parentFolderData = global.apolloClient.cache.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GetChildrenDocument,
					variables: getChildrenVariables(parentFolder.id, NODES_LOAD_LIMIT * 2)
				});
				expect((parentFolderData?.getNode as Folder).children.nodes).toHaveLength(
					parentFolder.children.nodes.length
				);
				// element is moved at its new position ( -1 because it is also remove from its previous position)
				expect((parentFolderData?.getNode as Folder).children.nodes[newPosition - 1]!.id).toBe(
					element.id
				);
				expect((parentFolderData?.getNode as Folder).children.nodes[newPosition - 1]!.name).toBe(
					newName
				);
			});

			test('Rename a node with a parent folder already partially loaded, where node is not loaded yet, add node in cached children of the parent folder', async () => {
				// nodes shown in the filter, only one page
				const currentFilter = populateNodes(NODES_LOAD_LIMIT - 1, 'Folder');
				// the element to rename is the last of the filter list
				// its new position is going to be the same for the filter view,
				// while in the parent folder it will be positioned as first element of the ordered list
				const element = currentFilter[currentFilter.length - 1];
				// nodes of the folder already cached from a previous navigation (1 page of n)
				// node is not present in the cached children of the folder
				const parentFolder = populateFolder(NODES_LOAD_LIMIT);
				// enable permission to rename
				parentFolder.permissions.can_write_folder = true;
				element.permissions.can_write_folder = true;
				element.parent = parentFolder;

				// new name set to put element as first element in folder
				const newName = parentFolder.children.nodes[0]!.name.substring(
					0,
					parentFolder.children.nodes[0]!.name.length - 1
				);

				// prepare the cache with the parent folder as if already loaded
				global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
					query: GetChildrenDocument,
					variables: getChildrenVariables(parentFolder.id),
					data: {
						getNode: parentFolder
					}
				});

				const nodeWithNewName = { ...element, name: newName, parent: parentFolder } satisfies
					| File
					| Folder;
				const mocks = {
					Query: {
						findNodes: mockFindNodes(currentFilter),
						getNode: mockGetNode({ getNode: [nodeWithNewName] })
					},
					Mutation: {
						updateNode: mockUpdateNode(nodeWithNewName)
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				// wait for the load to be completed
				await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

				// check the position of the node to update in the cached parent folder
				// load two pages even if only one should be written in cache
				let parentFolderData = global.apolloClient.cache.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GetChildrenDocument,
					variables: getChildrenVariables(parentFolder.id, NODES_LOAD_LIMIT * 2)
				});
				expect(parentFolderData?.getNode).toBeDefined();
				expect(parentFolderData?.getNode).not.toBeNull();
				expect((parentFolderData?.getNode as Folder).children.nodes).toHaveLength(NODES_LOAD_LIMIT);
				// element is not present in the cache
				expect(
					find(
						(parentFolderData?.getNode as Folder).children.nodes,
						(child) => child!.id === element.id
					)
				).toBe(undefined);
				// right click to open contextual menu
				const nodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
				// open context menu
				await user.rightClick(nodeItem);
				await renameNode(newName, user);
				// check the new item. It has the new name and its located at same position
				const updatedNodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
				expect(updatedNodeItem).toBeVisible();
				expect(within(updatedNodeItem).getByText(newName)).toBeVisible();
				const nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
				expect(nodes).toHaveLength(currentFilter.length);
				expect(nodes[nodes.length - 1]).toBe(updatedNodeItem);
				// check that in the parent folder the node has changed its position to first position
				parentFolderData = global.apolloClient.cache.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GetChildrenDocument,
					variables: getChildrenVariables(parentFolder.id, NODES_LOAD_LIMIT * 2)
				});
				// cached folder has 1 element more than the initial children.nodes list
				expect((parentFolderData?.getNode as Folder).children.nodes).toHaveLength(
					parentFolder.children.nodes.length + 1
				);
				expect((parentFolderData?.getNode as Folder).children.nodes[0]!.id).toBe(element.id);
				expect((parentFolderData?.getNode as Folder).children.nodes[0]!.name).toBe(newName);
			});
		});
	});
});
