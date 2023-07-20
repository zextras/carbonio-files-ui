/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { fireEvent, screen, within } from '@testing-library/react';
import { map } from 'lodash';

import FolderView from './FolderView';
import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import { populateFolder, populateNode, populateParents } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { Resolvers } from '../types/graphql/types';
import { mockGetNode, mockGetPath, mockMoveNodes } from '../utils/mockUtils';
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

			const mocks: Partial<Resolvers> = {
				Query: {
					getNode: mockGetNode(currentFolder),
					getPath: mockGetPath([currentFolder])
				}
			};
			const { findByTextWithMarkup } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
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
			const mocks: Partial<Resolvers> = {
				Query: {
					getNode: mockGetNode(currentFolder),
					getPath: mockGetPath([currentFolder])
				}
			};

			setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
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
			const mocks: Partial<Resolvers> = {
				Query: {
					getNode: mockGetNode(currentFolder, currentFolder.children.nodes[0] as Node),
					getPath: mockGetPath([currentFolder])
				}
			};
			const { getByTextWithMarkup, user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});
			const nodeItem = await screen.findByText((currentFolder.children.nodes[0] as Node).name);
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

			const mocks: Partial<Resolvers> = {
				Query: {
					getNode: mockGetNode(currentFolder, node),
					getPath: mockGetPath(path, parentPath)
				},
				Mutation: {
					moveNodes: mockMoveNodes([{ ...node, parent: destinationFolder }])
				}
			};
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
			const mocks: Partial<Resolvers> = {
				Query: {
					getNode: mockGetNode(currentFolder),
					getPath: mockGetPath([currentFolder])
				}
			};
			setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
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
			const mocks: Partial<Resolvers> = {
				Query: {
					getNode: mockGetNode(currentFolder),
					getPath: mockGetPath([currentFolder])
				}
			};
			setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
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
});
