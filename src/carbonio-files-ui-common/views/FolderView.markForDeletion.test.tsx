/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { forEach, map } from 'lodash';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import { NODES_LOAD_LIMIT } from '../constants';
import { ACTION_REGEXP, COLORS, ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFile, populateFolder, populateNodePage, sortNodes } from '../mocks/mockUtils';
import { setup, selectNodes, triggerListLoadMore } from '../tests/utils';
import { QueryResolvers, Resolvers } from '../types/graphql/resolvers-types';
import { File, Folder, NodeSort } from '../types/graphql/types';
import { mockGetNode, mockGetPath, mockTrashNodes } from '../utils/resolverMocks';

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

describe('Mark for deletion - trash', () => {
	describe('Selection mode', () => {
		test('Mark for deletion remove selected items from the list', async () => {
			const currentFolder = populateFolder(0);
			const fileId1 = 'fileId1';
			const filename1 = 'fileName1';
			const file = populateFile(fileId1, filename1);
			file.permissions.can_write_file = false;
			file.parent = populateFolder(0, currentFolder.id, currentFolder.name);
			currentFolder.children.nodes.push(file);

			const folderId1 = 'folderId1';
			const folderName1 = 'folderName1';
			const folder = populateFolder(0, folderId1, folderName1);
			folder.permissions.can_write_folder = true;
			folder.parent = populateFolder(0, currentFolder.id, currentFolder.name);
			currentFolder.children.nodes.push(folder);

			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
				},
				Mutation: {
					trashNodes: mockTrashNodes([folderId1])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(filename1);
			await screen.findByText(folderName1);

			// activate selection mode by selecting items
			await selectNodes([folderId1], user);
			// check that all wanted items are selected
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();

			await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));

			const trashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(trashAction).toHaveStyle({
				color: COLORS.text.regular
			});
			await user.click(trashAction);

			await screen.findByText(/item moved to trash/i);
			expect(trashAction).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

			expect(screen.queryAllByTestId(SELECTORS.nodeAvatar).length).toEqual(1);

			// activate selection mode by selecting items
			await selectNodes([fileId1], user);
			// check that all wanted items are selected
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();

			await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));

			// wait for copy action to check that popper is open
			const copyAction = await screen.findByText(ACTION_REGEXP.copy);
			expect(copyAction).toHaveStyle({
				color: COLORS.text.regular
			});
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
		});

		test('Mark for deletion of all loaded nodes trigger refetch of first page', async () => {
			const currentFolder = populateFolder(NODES_LOAD_LIMIT * 2);
			forEach(currentFolder.children.nodes, (mockedNode) => {
				if (mockedNode) {
					mockedNode.permissions.can_write_file = true;
					mockedNode.permissions.can_write_folder = true;
				}
			});
			const firstPage = currentFolder.children.nodes.slice(0, NODES_LOAD_LIMIT);
			const secondPage = currentFolder.children.nodes.slice(NODES_LOAD_LIMIT);
			const nodesToTrash = map(firstPage, (node) => node?.id || '');

			const getChildrenResponses = [
				{ ...currentFolder, children: populateNodePage(firstPage) },
				{ ...currentFolder, children: populateNodePage(secondPage) }
			];
			const getNodeResolver: QueryResolvers['getNode'] = (parent, args, context, info) => {
				if (info.operation.name?.value === 'getChildren') {
					const response = getChildrenResponses.shift();
					if (response) {
						return response;
					}
					throw new Error('no more getChildren responses provided to getNode resolver');
				}
				return currentFolder;
			};
			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: getNodeResolver
				},
				Mutation: {
					trashNodes: mockTrashNodes(nodesToTrash)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(firstPage[0]!.name);
			expect(screen.getByText(firstPage[0]!.name)).toBeVisible();
			expect(screen.getByText(firstPage[NODES_LOAD_LIMIT - 1]!.name)).toBeVisible();
			expect(screen.queryByText(secondPage[0]!.name)).not.toBeInTheDocument();
			await selectNodes(nodesToTrash, user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(firstPage.length);
			expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
			const trashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(trashAction).toBeVisible();
			act(() => {
				// run lazy query
				jest.runOnlyPendingTimers();
			});
			await user.click(trashAction);
			await screen.findByText(/Item moved to trash/i);
			await screen.findByText(secondPage[0]!.name);
			expect(screen.queryByText(firstPage[0]!.name)).not.toBeInTheDocument();
			expect(screen.queryByText(firstPage[NODES_LOAD_LIMIT - 1]!.name)).not.toBeInTheDocument();
			expect(screen.queryByText(firstPage[0]!.name)).not.toBeInTheDocument();
			expect(screen.queryByText(firstPage[NODES_LOAD_LIMIT - 1]!.name)).not.toBeInTheDocument();
		});
	});

	describe('Contextual menu actions', () => {
		test('Mark for deletion from context menu', async () => {
			const currentFolder = populateFolder(5);
			// enable permission to MfD
			forEach(currentFolder.children.nodes, (mockedNode) => {
				if (mockedNode) {
					mockedNode.permissions.can_write_file = true;
					mockedNode.permissions.can_write_folder = true;
					mockedNode.parent = populateFolder(0, currentFolder.id, currentFolder.name);
				}
			});
			const sort = NodeSort.NameAsc; // sort only by name
			sortNodes(currentFolder.children.nodes, sort);

			const element = currentFolder.children.nodes[0]!;

			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
				},
				Mutation: {
					trashNodes: mockTrashNodes([element.id])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			// wait for the load to be completed
			await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

			expect(screen.getAllByTestId(SELECTORS.nodeAvatar)).toHaveLength(5);

			// right click to open contextual menu
			const nodeItem = screen.getByTestId(SELECTORS.nodeItem(element.id));
			// open context menu
			await user.rightClick(nodeItem);

			await screen.findByText(ACTION_REGEXP.moveToTrash);
			await user.click(screen.getByText(ACTION_REGEXP.moveToTrash));

			await screen.findByText(/Item moved to trash/i);

			// contextual menu is closed
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
			expect(screen.queryAllByTestId(SELECTORS.nodeAvatar).length).toEqual(4);
		});

		test('Mark for deletion from context menu on selected nodes', async () => {
			const currentFolder = populateFolder(5);
			// enable permission to Mfd
			forEach(currentFolder.children.nodes, (mockedNode) => {
				if (mockedNode) {
					mockedNode.permissions.can_write_file = true;
					mockedNode.permissions.can_write_folder = true;
					mockedNode.parent = populateFolder(0, currentFolder.id, currentFolder.name);
				}
			});
			const sort = NodeSort.NameAsc; // sort only by name
			sortNodes(currentFolder.children.nodes, sort);

			const element0 = currentFolder.children.nodes[0]!;
			const element1 = currentFolder.children.nodes[1]!;

			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
				},
				Mutation: {
					trashNodes: mockTrashNodes([element0.id, element1.id])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			// wait for the load to be completed
			await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

			expect(screen.queryAllByTestId(SELECTORS.nodeAvatar).length).toEqual(5);

			await selectNodes([element0.id, element1.id], user);

			// right click to open contextual menu
			const nodeItem = screen.getByTestId(SELECTORS.nodeItem(element0.id));
			// open context menu
			await user.rightClick(nodeItem);

			await screen.findByText(ACTION_REGEXP.moveToTrash);
			await user.click(screen.getByText(ACTION_REGEXP.moveToTrash));
			await screen.findByText(/Item moved to trash/i);

			// contextual menu is closed
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();

			expect(screen.queryAllByTestId(SELECTORS.nodeAvatar).length).toEqual(3);
		});

		test('Mark for deletion of last ordered node trigger load of the new page with the new cursor', async () => {
			const currentFolder = populateFolder(NODES_LOAD_LIMIT * 2);
			currentFolder.permissions.can_write_folder = true;
			currentFolder.permissions.can_write_file = true;
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
					trashNodes: mockTrashNodes([firstPage[NODES_LOAD_LIMIT - 1].id])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(firstPage[0].name);
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getByText(firstPage[NODES_LOAD_LIMIT - 1].name)).toBeVisible();
			await user.rightClick(screen.getByText(firstPage[NODES_LOAD_LIMIT - 1].name));
			const moveToTrashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(moveToTrashAction).toBeVisible();
			expect(moveToTrashAction).toHaveStyle({
				color: COLORS.text.regular
			});
			await user.click(moveToTrashAction);
			await screen.findByText(/Item moved to trash/i);
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();
			triggerListLoadMore();
			await screen.findByText(secondPage[0].name);
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
			expect(screen.getByText(secondPage[NODES_LOAD_LIMIT - 1].name)).toBeVisible();
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.queryByText(firstPage[NODES_LOAD_LIMIT - 1].name)).not.toBeInTheDocument();
		});
	});
});
