/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, fireEvent, waitFor, within } from '@testing-library/react';
import { forEach, map } from 'lodash';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import { NODES_LOAD_LIMIT } from '../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFolder, populateNodePage } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { Resolvers } from '../types/graphql/resolvers-types';
import {
	Folder,
	GetChildrenDocument,
	GetChildrenQuery,
	GetChildrenQueryVariables
} from '../types/graphql/types';
import {
	getChildrenVariables,
	mockGetNode,
	mockGetPath,
	mockMoveNodes
} from '../utils/resolverMocks';
import {
	moveNode,
	setup,
	selectNodes,
	triggerLoadMore,
	screen,
	buildBreadCrumbRegExp
} from '../utils/testUtils';

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions');

jest.mock<typeof import('./components/Displayer')>('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): React.JSX.Element => (
		<div data-testid="map">
			{props.translationKey}:{props.icons}
		</div>
	)
}));

describe('Move', () => {
	describe('Selection mode', () => {
		test('Move for single node confirm action close the modal, remove items to move from children and clear cached data for destination folder', async () => {
			const currentFolder = populateFolder(5);
			currentFolder.permissions.can_write_folder = true;
			currentFolder.permissions.can_write_file = true;
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			currentFolder.children.nodes.push(destinationFolder);
			const nodeToMove = currentFolder.children.nodes[0] as Node;
			nodeToMove.permissions.can_write_folder = true;
			nodeToMove.permissions.can_write_file = true;

			// write destination folder in cache as if it was already loaded
			global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(destinationFolder.id),
				data: {
					getNode: destinationFolder
				}
			});
			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
				},
				Mutation: {
					moveNodes: mockMoveNodes([{ ...nodeToMove, parent: destinationFolder }])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(nodeToMove.name);

			let destinationFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(destinationFolder.id)
			});

			expect(destinationFolderCachedData?.getNode || null).not.toBeNull();
			expect((destinationFolderCachedData?.getNode as Folder).id).toBe(destinationFolder.id);

			// activate selection mode by selecting items
			await selectNodes([nodeToMove.id], user);
			// check that all wanted items are selected
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
			await moveNode(destinationFolder, user);
			await screen.findByText(/Item moved/i);
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

			expect(screen.queryAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				currentFolder.children.nodes.length - 1
			);

			destinationFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(destinationFolder.id)
			});

			expect(destinationFolderCachedData).toBeNull();
		});

		test('Move for multiple nodes confirm action close the modal, remove items to move from children and clear cached data for destination folder', async () => {
			const currentFolder = populateFolder(5);
			currentFolder.permissions.can_write_folder = true;
			currentFolder.permissions.can_write_file = true;
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			currentFolder.children.nodes.push(destinationFolder);
			const nodesToMove = [
				currentFolder.children.nodes[0],
				currentFolder.children.nodes[1]
			] as Node[];
			forEach(nodesToMove, (mockedNode) => {
				mockedNode.permissions.can_write_folder = true;
				mockedNode.permissions.can_write_file = true;
			});

			// write destination folder in cache as if it was already loaded
			global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(destinationFolder.id),
				data: {
					getNode: destinationFolder
				}
			});
			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
				},
				Mutation: {
					moveNodes: mockMoveNodes(
						map(nodesToMove, (nodeToMove) => ({ ...nodeToMove, parent: destinationFolder }))
					)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(nodesToMove[0].name);

			let destinationFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(destinationFolder.id)
			});

			expect(destinationFolderCachedData?.getNode || null).not.toBeNull();
			expect((destinationFolderCachedData?.getNode as Folder).id).toBe(destinationFolder.id);

			// activate selection mode by selecting items
			await selectNodes(
				map(nodesToMove, (nodeToMove) => nodeToMove.id),
				user
			);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodesToMove.length);
			let moveAction = screen.queryByTestId(ICON_REGEXP.move);
			if (!moveAction) {
				expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
				await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
				moveAction = await screen.findByText('Move');
			}
			expect(moveAction).toBeVisible();
			await user.click(moveAction);
			const modalList = await screen.findByTestId(SELECTORS.modalList);
			const destinationFolderItem = await within(modalList).findByText(destinationFolder.name);
			await user.click(destinationFolderItem);
			await waitFor(() => expect(screen.getByRole('button', { name: /move/i })).toBeEnabled());
			await user.click(screen.getByRole('button', { name: /move/i }));
			expect(screen.queryByRole('button', { name: /move/i })).not.toBeInTheDocument();
			expect(screen.queryByText('Move')).not.toBeInTheDocument();
			await screen.findByText(/Item moved/i);
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

			expect(screen.queryAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				currentFolder.children.nodes.length - nodesToMove.length
			);

			destinationFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(destinationFolder.id)
			});

			expect(destinationFolderCachedData).toBeNull();
		});

		test('Move of all loaded nodes trigger refetch of first page', async () => {
			const commonParent = populateFolder();
			commonParent.permissions.can_write_file = true;
			commonParent.permissions.can_write_folder = true;
			const currentFolder = populateFolder(NODES_LOAD_LIMIT * 2);
			currentFolder.parent = commonParent;
			currentFolder.permissions.can_write_folder = true;
			currentFolder.permissions.can_write_file = true;
			const destinationFolder = populateFolder();
			destinationFolder.parent = commonParent;
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			commonParent.children.nodes.push(currentFolder, destinationFolder);
			forEach(currentFolder.children.nodes, (mockedNode) => {
				if (mockedNode) {
					mockedNode.permissions.can_write_file = true;
					mockedNode.permissions.can_write_folder = true;
					mockedNode.parent = currentFolder;
				}
			});
			const firstPage = currentFolder.children.nodes.slice(0, NODES_LOAD_LIMIT) as Node[];
			const secondPage = currentFolder.children.nodes.slice(NODES_LOAD_LIMIT) as Node[];
			const nodesToMove = [...firstPage];

			const mocks = {
				Query: {
					getPath: mockGetPath([commonParent], [commonParent, currentFolder]),
					// use default children resolver to split children in pages
					getNode: mockGetNode({
						getChildren: [
							{ ...currentFolder, children: populateNodePage(firstPage) },
							{ ...currentFolder, children: populateNodePage(secondPage) },
							commonParent
						],
						getPermissions: [currentFolder]
					})
				},
				Mutation: {
					moveNodes: mockMoveNodes(
						map(nodesToMove, (node) => ({ ...node, parent: destinationFolder }))
					)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(firstPage[0].name);
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getByText(firstPage[NODES_LOAD_LIMIT - 1].name)).toBeVisible();
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();
			await selectNodes(
				map(nodesToMove, (node) => node.id),
				user
			);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(firstPage.length);
			expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
			const moveAction = await screen.findByText(ACTION_REGEXP.move);
			expect(moveAction).toBeVisible();
			// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
			expect(moveAction).not.toHaveAttribute('disabled', '');
			await user.click(moveAction);
			await screen.findByTextWithMarkup(
				buildBreadCrumbRegExp(commonParent.name, currentFolder.name)
			);
			const modalList = screen.getByTestId(SELECTORS.modalList);
			await within(modalList).findByText((currentFolder.children.nodes[0] as Node).name);
			const moveModalButton = await screen.findByRole('button', { name: ACTION_REGEXP.move });
			expect(moveModalButton).toBeDisabled();
			act(() => {
				// run path lazy query
				jest.runOnlyPendingTimers();
			});
			await user.click(screen.getByText(commonParent.name));
			await screen.findByTextWithMarkup(buildBreadCrumbRegExp(commonParent.name));
			await screen.findByText(destinationFolder.name);
			act(() => {
				// 	run modal timers
				jest.runOnlyPendingTimers();
			});
			expect(screen.getByText(destinationFolder.name)).toBeVisible();
			expect(screen.getByText(currentFolder.name)).toBeVisible();
			await user.click(screen.getByText(destinationFolder.name));
			await waitFor(() => expect(moveModalButton).toBeEnabled());
			await user.click(moveModalButton);
			await screen.findByText(/Item moved/i);
			await screen.findByText(secondPage[0].name);
			expect(screen.queryByText(firstPage[0].name)).not.toBeInTheDocument();
			expect(screen.queryByText(firstPage[NODES_LOAD_LIMIT - 1].name)).not.toBeInTheDocument();
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
			expect(screen.getByText(secondPage[NODES_LOAD_LIMIT - 1].name)).toBeVisible();
		});
	});

	describe('Contextual menu actions', () => {
		test('Move confirm action close the modal, remove items to move from children and clear cached data for destination folder', async () => {
			const currentFolder = populateFolder(5);
			currentFolder.permissions.can_write_folder = true;
			currentFolder.permissions.can_write_file = true;
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			currentFolder.children.nodes.push(destinationFolder);
			const nodeToMove = currentFolder.children.nodes[0] as Node;
			nodeToMove.permissions.can_write_folder = true;
			nodeToMove.permissions.can_write_file = true;

			// write destination folder in cache as if it was already loaded
			global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(destinationFolder.id),
				data: {
					getNode: destinationFolder
				}
			});

			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
				},
				Mutation: {
					moveNodes: mockMoveNodes([{ ...nodeToMove, parent: destinationFolder }])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(nodeToMove.name);

			let destinationFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(destinationFolder.id)
			});

			expect(destinationFolderCachedData?.getNode || null).not.toBeNull();
			expect((destinationFolderCachedData?.getNode as Folder).id).toBe(destinationFolder.id);

			// right click to open contextual menu on folder
			const nodeToMoveItem = await screen.findByText(nodeToMove.name);
			fireEvent.contextMenu(nodeToMoveItem);

			await moveNode(destinationFolder, user);
			await screen.findByText(/Item moved/i);

			expect(screen.queryAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				currentFolder.children.nodes.length - 1
			);

			destinationFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(destinationFolder.id)
			});

			expect(destinationFolderCachedData).toBeNull();
		});

		test.skip('Move of last ordered node update cursor to be last ordered node and trigger load of the next page with the new cursor', async () => {
			const currentFolder = populateFolder(NODES_LOAD_LIMIT * 2 - 1);
			const destinationFolder = populateFolder();
			currentFolder.children.nodes.unshift(destinationFolder);
			currentFolder.permissions.can_write_folder = true;
			currentFolder.permissions.can_write_file = true;
			forEach(currentFolder.children.nodes, (mockedNode) => {
				if (mockedNode) {
					mockedNode.permissions.can_write_file = true;
					mockedNode.permissions.can_write_folder = true;
					mockedNode.parent = currentFolder;
				}
			});
			const firstPage = currentFolder.children.nodes.slice(0, NODES_LOAD_LIMIT) as Node[];
			const secondPage = currentFolder.children.nodes.slice(NODES_LOAD_LIMIT) as Node[];

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
					moveNodes: mockMoveNodes([
						{ ...firstPage[NODES_LOAD_LIMIT - 1], parent: destinationFolder }
					])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(firstPage[0].name);
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getByText(firstPage[NODES_LOAD_LIMIT - 1].name)).toBeVisible();
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();
			fireEvent.contextMenu(screen.getByText(firstPage[NODES_LOAD_LIMIT - 1].name));
			await moveNode(destinationFolder, user);
			await screen.findByText(/Item moved/i);
			expect(screen.queryByText(firstPage[NODES_LOAD_LIMIT - 1].name)).not.toBeInTheDocument();
			expect(screen.queryByText(secondPage[0].name)).not.toBeInTheDocument();
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				firstPage.length - 1
			);
			expect(screen.getByTestId(ICON_REGEXP.queryLoading)).toBeVisible();
			await triggerLoadMore();
			await screen.findByText(secondPage[0].name);
			expect(screen.getByText(secondPage[0].name)).toBeVisible();
			expect(screen.getByText(secondPage[NODES_LOAD_LIMIT - 1].name)).toBeVisible();
			expect(screen.getByText(firstPage[0].name)).toBeVisible();
			expect(screen.queryByText(firstPage[NODES_LOAD_LIMIT - 1].name)).not.toBeInTheDocument();
		});
	});
});
