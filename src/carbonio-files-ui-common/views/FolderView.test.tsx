/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { fireEvent, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { map } from 'lodash';

import FolderView from './FolderView';
import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import { ICON_REGEXP } from '../constants/test';
import GET_CHILDREN from '../graphql/queries/getChildren.graphql';
import GET_NODE from '../graphql/queries/getNode.graphql';
import GET_PERMISSIONS from '../graphql/queries/getPermissions.graphql';
import { populateFolder, populateNode, populateParents } from '../mocks/mockUtils';
import { Node } from '../types/common';
import {
	GetChildrenQuery,
	GetChildrenQueryVariables,
	GetNodeQuery,
	GetNodeQueryVariables,
	GetPathQuery,
	GetPathQueryVariables,
	GetPermissionsQuery,
	GetPermissionsQueryVariables
} from '../types/graphql/types';
import {
	getChildrenVariables,
	getNodeVariables,
	mockGetChildren,
	mockGetNode,
	mockGetPath,
	mockGetPermissions,
	mockMoveNodes
} from '../utils/mockUtils';
import { buildBreadCrumbRegExp, moveNode, setup } from '../utils/testUtils';

let mockedCreateOptions: CreateOptionsContent['createOptions'];

beforeEach(() => {
	mockedCreateOptions = [];
});

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest
			.fn()
			.mockImplementation((...options: Parameters<CreateOptionsContent['setCreateOptions']>[0]) => {
				mockedCreateOptions = options;
			}),
		removeCreateOptions: jest.fn()
	})
}));

describe('Folder View', () => {
	describe('Create Folder', () => {
		test('Create folder option is disabled if current folder has not can_write_folder permission', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_folder = false;
			currentFolder.permissions.can_write_file = false;
			// prepare cache so that apollo client read data from the cache
			const getChildrenMockedQuery = mockGetChildren(
				getChildrenVariables(currentFolder.id),
				currentFolder
			);
			global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				...getChildrenMockedQuery.request,
				data: {
					getNode: currentFolder
				}
			});
			const getPathMockedQuery = mockGetPath({ node_id: currentFolder.id }, [currentFolder]);
			global.apolloClient.writeQuery<GetPathQuery, GetPathQueryVariables>({
				...getPathMockedQuery.request,
				data: {
					getPath: [currentFolder]
				}
			});
			global.apolloClient.writeQuery<GetPermissionsQuery, GetPermissionsQueryVariables>({
				query: GET_PERMISSIONS,
				variables: { node_id: currentFolder.id },
				data: {
					getNode: currentFolder
				}
			});
			const { findByTextWithMarkup } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`]
			});
			await screen.findByText(/nothing here/i);
			await findByTextWithMarkup(buildBreadCrumbRegExp(currentFolder.name));
			expect(map(mockedCreateOptions, (createOption) => createOption.action({}))).toEqual(
				expect.arrayContaining([expect.objectContaining({ id: 'create-folder', disabled: true })])
			);
			expect.assertions(1);
		});

		test('Create folder option is active if current folder has can_write_folder permission', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_folder = true;
			const getChildrenMockedQuery = mockGetChildren(
				getChildrenVariables(currentFolder.id),
				currentFolder
			);
			global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				...getChildrenMockedQuery.request,
				data: {
					getNode: currentFolder
				}
			});
			const getPathMockedQuery = mockGetPath({ node_id: currentFolder.id }, [currentFolder]);
			global.apolloClient.writeQuery<GetPathQuery, GetPathQueryVariables>({
				...getPathMockedQuery.request,
				data: {
					getPath: [currentFolder]
				}
			});
			// prepare cache so that apollo client read data from the cache
			global.apolloClient.writeQuery<GetPermissionsQuery, GetPermissionsQueryVariables>({
				query: GET_PERMISSIONS,
				variables: { node_id: currentFolder.id },
				data: {
					getNode: currentFolder
				}
			});
			setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`]
			});
			await screen.findByText(/nothing here/i);
			expect(map(mockedCreateOptions, (createOption) => createOption.action({}))).toEqual(
				expect.arrayContaining([expect.objectContaining({ id: 'create-folder', disabled: false })])
			);
			expect.assertions(1);
		});
	});

	describe('Displayer', () => {
		test('Single click on a node opens the details tab on displayer', async () => {
			const currentFolder = populateFolder(2);
			// prepare cache so that apollo client read data from the cache
			global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				query: GET_CHILDREN,
				variables: getChildrenVariables(currentFolder.id),
				data: {
					getNode: currentFolder
				}
			});
			global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
				query: GET_NODE,
				variables: getNodeVariables((currentFolder.children.nodes[0] as Node).id),
				data: {
					getNode: currentFolder.children.nodes[0] as Node
				}
			});
			const { getByTextWithMarkup, user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`]
			});
			const nodeItem = screen.getByText((currentFolder.children.nodes[0] as Node).name);
			expect(nodeItem).toBeVisible();
			const displayer = screen.getByTestId('displayer');
			expect(within(displayer).queryByText(/details/i)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(
				within(displayer).getAllByText((currentFolder.children.nodes[0] as Node).name)
			).toHaveLength(2);
			expect(
				getByTextWithMarkup(buildBreadCrumbRegExp((currentFolder.children.nodes[0] as Node).name))
			).toBeVisible();
			expect.assertions(4);
		});

		test('Move action close the displayer if node is removed from the main list', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_folder = true;
			currentFolder.permissions.can_write_file = true;
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			currentFolder.children.nodes.push(destinationFolder);
			const { path: parentPath } = populateParents(currentFolder);
			const node = populateNode();
			node.parent = currentFolder;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			currentFolder.children.nodes.push(node);
			const path = [...parentPath, node];

			const mocks = [
				mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
				mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
				mockGetNode(getNodeVariables(node.id), node),
				mockGetPath({ node_id: node.id }, path),
				mockGetPath({ node_id: currentFolder.id }, parentPath),
				mockMoveNodes({ destination_id: destinationFolder.id, node_ids: [node.id] }, [
					{ ...node, parent: destinationFolder }
				])
			];
			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}&node=${node.id}`],
				mocks
			});
			const displayer = await screen.findByTestId('displayer');
			await screen.findAllByText(node.name);
			await screen.findByText(destinationFolder.name);
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			// right click to open contextual menu
			const nodeToMoveItem = within(screen.getByTestId(`list-${currentFolder.id}`)).getByText(
				node.name
			);
			fireEvent.contextMenu(nodeToMoveItem);
			await moveNode(destinationFolder, user);
			await screen.findByText(/item moved/i);
			await screen.findByText(/view files and folders/i);
			expect(screen.queryByTestId(`node-item-${node.id}`)).not.toBeInTheDocument();
			expect(screen.queryAllByTestId('node-item-', { exact: false })).toHaveLength(
				currentFolder.children.nodes.length - 1
			);
			expect(screen.queryByText(/details/i)).not.toBeInTheDocument();
			expect(within(displayer).queryByText(node.name)).not.toBeInTheDocument();
			expect(
				screen.getByText(/View files and folders, share them with your contacts/i)
			).toBeVisible();
		});
	});

	describe('Create docs files', () => {
		test('Create file options are disabled if current folder has not can_write_file permission', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_file = false;
			// prepare cache so that apollo client read data from the cache
			global.apolloClient.writeQuery<GetPermissionsQuery, GetPermissionsQueryVariables>({
				query: GET_PERMISSIONS,
				variables: { node_id: currentFolder.id },
				data: {
					getNode: currentFolder
				}
			});
			// prepare cache so that apollo client read data from the cache
			const mockedGetChildrenQuery = mockGetChildren(
				getChildrenVariables(currentFolder.id),
				currentFolder
			);
			global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				...mockedGetChildrenQuery.request,
				data: {
					getNode: currentFolder
				}
			});
			const getPathMockedQuery = mockGetPath({ node_id: currentFolder.id }, [currentFolder]);
			global.apolloClient.writeQuery<GetPathQuery, GetPathQueryVariables>({
				...getPathMockedQuery.request,
				data: {
					getPath: [currentFolder]
				}
			});

			setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`]
			});

			await screen.findByText(/nothing here/i);
			expect(map(mockedCreateOptions, (createOption) => createOption.action({}))).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: 'create-docs-document', disabled: true }),
					expect.objectContaining({ id: 'create-docs-spreadsheet', disabled: true }),
					expect.objectContaining({ id: 'create-docs-presentation', disabled: true })
				])
			);
			expect.assertions(1);
		});

		test('Create docs files options are active if current folder has can_write_file permission', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_file = true;
			// prepare cache so that apollo client read data from the cache
			global.apolloClient.writeQuery<GetPermissionsQuery, GetPermissionsQueryVariables>({
				query: GET_PERMISSIONS,
				variables: { node_id: currentFolder.id },
				data: {
					getNode: currentFolder
				}
			});
			const mockedGetChildrenQuery = mockGetChildren(
				getChildrenVariables(currentFolder.id),
				currentFolder
			);
			global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				...mockedGetChildrenQuery.request,
				data: {
					getNode: currentFolder
				}
			});
			const getPathMockedQuery = mockGetPath({ node_id: currentFolder.id }, [currentFolder]);
			global.apolloClient.writeQuery<GetPathQuery, GetPathQueryVariables>({
				...getPathMockedQuery.request,
				data: {
					getPath: [currentFolder]
				}
			});

			setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`]
			});
			await screen.findByText(/nothing here/i);
			expect(map(mockedCreateOptions, (createOption) => createOption.action({}))).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: 'create-docs-document', disabled: false }),
					expect.objectContaining({ id: 'create-docs-spreadsheet', disabled: false }),
					expect.objectContaining({ id: 'create-docs-presentation', disabled: false })
				])
			);
			expect.assertions(1);
		});
	});

	test('should show the list of valid nodes even if the children include some invalid node', async () => {
		const folder = populateFolder(2);
		const node = populateNode();
		folder.children.nodes.push(null, node);
		const mocks = [
			mockGetChildren(getChildrenVariables(folder.id), folder),
			mockGetPermissions({ node_id: folder.id }, folder),
			mockGetPath({ node_id: folder.id }, [folder])
		];
		setup(<FolderView />, { initialRouterEntries: [`/?folder=${folder.id}`], mocks });
		await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
		await screen.findByText(node.name);
		expect(screen.getByText(node.name)).toBeVisible();
	});
});
