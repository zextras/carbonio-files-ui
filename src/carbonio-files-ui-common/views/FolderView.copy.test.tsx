/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import { act, fireEvent } from '@testing-library/react';
import { map } from 'lodash';
import { graphql, HttpResponse } from 'msw';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import server from '../../mocks/server';
import { ERROR_CODE } from '../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFile, populateFolder, populateLocalRoot } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { Resolvers } from '../types/graphql/resolvers-types';
import {
	CopyNodesDocument,
	CopyNodesMutation,
	CopyNodesMutationVariables,
	Folder,
	GetChildrenDocument,
	GetChildrenQuery,
	GetChildrenQueryVariables
} from '../types/graphql/types';
import {
	getChildrenVariables,
	mockCopyNodes,
	mockGetNode,
	mockGetPath
} from '../utils/resolverMocks';
import { setup, selectNodes, screen, within, generateError } from '../utils/testUtils';

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions');

jest.mock<typeof import('./components/Displayer')>('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): React.JSX.Element => (
		<div data-testid="map">
			{props.translationKey}:{props.icons}
		</div>
	)
}));

describe('Copy', () => {
	describe('Selection mode', () => {
		test('Copy is enabled when multiple files are selected', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			const file = populateFile();
			file.parent = currentFolder;
			const folder = populateFolder();
			folder.parent = currentFolder;
			currentFolder.children.nodes.push(file, folder);

			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(file.name);
			await selectNodes([file.id, folder.id], user);

			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);
			const copyAction = await screen.findByRoleWithIcon('button', { icon: ICON_REGEXP.copy });
			expect(copyAction).toBeVisible();
			expect(copyAction).toBeEnabled();
		});

		test('Copy confirm action close the modal and clear cached data for destination folder if destination folder is not current folder', async () => {
			const currentFolder = populateFolder(5);
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			currentFolder.children.nodes.push(destinationFolder);
			const nodeToCopy = currentFolder.children.nodes[0] as Node;

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
					copyNodes: mockCopyNodes([{ ...nodeToCopy, parent: destinationFolder }])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(nodeToCopy.name);

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
			await selectNodes([nodeToCopy.id], user);
			// check that all wanted items are selected
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeVisible();
			let copyAction = screen.queryByTestId(ICON_REGEXP.copy);
			if (!copyAction) {
				expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
				await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
				copyAction = await screen.findByText(ACTION_REGEXP.copy);
				expect(copyAction).toBeVisible();
			}
			await user.click(copyAction);

			const modalList = await screen.findByTestId(SELECTORS.modalList);
			const destinationFolderItem = await within(modalList).findByText(destinationFolder.name);
			await user.click(destinationFolderItem);
			act(() => {
				// run timers of modal
				jest.advanceTimersToNextTimer();
			});
			expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).toBeEnabled();
			await user.click(screen.getByRole('button', { name: ACTION_REGEXP.copy }));
			await screen.findByText(/Item copied/i);
			expect(screen.queryByRole('button', { name: ACTION_REGEXP.copy })).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

			destinationFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(destinationFolder.id)
			});

			expect(destinationFolderCachedData).toBeNull();
		});

		test('Copy confirm action close the modal and add copied node in current folder list if it is the destination folder. New nodes are ordered in the list', async () => {
			const currentFolder = populateFolder(5);
			currentFolder.permissions.can_write_folder = true;
			currentFolder.permissions.can_write_file = true;
			const nodesToCopy = [
				currentFolder.children.nodes[0],
				currentFolder.children.nodes[1]
			] as Node[];
			const copiedNodes = map(nodesToCopy, (node) => ({
				...node,
				id: faker.string.uuid(),
				name: `${node.name}-copied`
			}));

			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
				},
				Mutation: {
					copyNodes: mockCopyNodes(copiedNodes)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(nodesToCopy[0].name);

			expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				currentFolder.children.nodes.length
			);
			// activate selection mode by selecting items
			await selectNodes(
				map(nodesToCopy, (node) => node.id),
				user
			);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodesToCopy.length);

			let copyAction = screen.queryByTestId(ICON_REGEXP.copy);
			if (!copyAction) {
				expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
				await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
				copyAction = await screen.findByText(ACTION_REGEXP.copy);
				expect(copyAction).toBeVisible();
			}
			await user.click(copyAction);

			const modalList = await screen.findByTestId(SELECTORS.modalList);
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			expect(within(modalList).getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				currentFolder.children.nodes.length
			);
			expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).toBeEnabled();
			await user.click(screen.getByRole('button', { name: ACTION_REGEXP.copy }));
			await screen.findByText(/Item copied/i);
			expect(screen.queryByRole('button', { name: ACTION_REGEXP.copy })).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

			const nodeItems = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(screen.getByText(copiedNodes[0].name)).toBeVisible();
			expect(screen.getByText(copiedNodes[1].name)).toBeVisible();
			expect(nodeItems).toHaveLength(currentFolder.children.nodes.length + copiedNodes.length);
			// each node is positioned after its original
			expect(screen.getByTestId(SELECTORS.nodeItem(copiedNodes[0].id))).toBe(nodeItems[1]);
			expect(screen.getByTestId(SELECTORS.nodeItem(copiedNodes[1].id))).toBe(nodeItems[3]);
		});

		it('should render the snackbar and copy only partial of nodes if the copy operation fails partially', async () => {
			const localRoot = populateLocalRoot(2);
			localRoot.permissions.can_write_folder = true;
			localRoot.permissions.can_write_file = true;
			const nodesToCopy = map(localRoot.children.nodes, (node) => ({
				...node
			})) as Node[];

			global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(localRoot.id),
				data: {
					getNode: localRoot
				}
			});

			server.use(
				graphql.query<GetChildrenQuery, GetChildrenQueryVariables>(GetChildrenDocument, () =>
					HttpResponse.json({
						data: {
							getNode: localRoot
						}
					})
				),
				graphql.mutation<CopyNodesMutation, CopyNodesMutationVariables>(CopyNodesDocument, () =>
					HttpResponse.json({
						data: {
							copyNodes: [{ ...nodesToCopy[0], id: 'node1-copy', name: 'node copied' }]
						},
						errors: [
							generateError(
								'Copy action failed. You have reached your storage limit. Delete some items to free up storage space and try again',
								ERROR_CODE.overQuotaReached
							)
						]
					})
				)
			);
			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${localRoot.id}`]
			});
			await screen.findByText(nodesToCopy[0].name);
			await screen.findByText(nodesToCopy[1].name);
			await selectNodes(
				map(nodesToCopy, (node) => node.id),
				user
			);
			await user.rightClick(screen.getByText(nodesToCopy[0].name));
			await screen.findByTestId(SELECTORS.dropdownList);
			await user.click(screen.getByText(ACTION_REGEXP.copy));
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			await user.click(screen.getByRole('button', { name: /copy/i }));
			const snackbar = await screen.findByTestId('snackbar');
			expect(
				within(snackbar).getByText(
					'Copy action failed. You have reached your storage limit. Delete some items to free up storage space and try again'
				)
			).toBeVisible();
			const nodeItems = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
			expect(screen.getByText(nodesToCopy[0].name)).toBeVisible();
			expect(screen.getByText(nodesToCopy[1].name)).toBeVisible();
			expect(screen.getByText(/node copied/i)).toBeVisible();
			expect(nodeItems).toHaveLength(localRoot.children.nodes.length + 1);
		});
	});

	describe('Contextual menu actions', () => {
		test('Copy confirm action close the modal and clear cached data for destination folder', async () => {
			const currentFolder = populateFolder(5);
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			currentFolder.children.nodes.push(destinationFolder);
			const nodeToCopy = currentFolder.children.nodes[0] as Node;

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
					copyNodes: mockCopyNodes([{ ...nodeToCopy, parent: destinationFolder }])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(nodeToCopy.name);

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
			const nodeToCopyItem = await screen.findByText(nodeToCopy.name);
			fireEvent.contextMenu(nodeToCopyItem);
			const copyAction = await screen.findByText(ACTION_REGEXP.copy);
			expect(copyAction).toBeVisible();
			await user.click(copyAction);

			const modalList = await screen.findByTestId(SELECTORS.modalList);
			const destinationFolderItem = await within(modalList).findByText(destinationFolder.name);
			await user.click(destinationFolderItem);
			act(() => {
				// run timers of modal
				jest.advanceTimersToNextTimer();
			});
			expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).toBeEnabled();
			await user.click(screen.getByRole('button', { name: ACTION_REGEXP.copy }));
			await screen.findByText(/Item copied/i);
			expect(screen.queryByRole('button', { name: ACTION_REGEXP.copy })).not.toBeInTheDocument();
			// context menu is closed
			expect(screen.queryByText(ACTION_REGEXP.copy)).not.toBeInTheDocument();

			destinationFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(destinationFolder.id)
			});

			expect(destinationFolderCachedData).toBeNull();
		});
	});
});
