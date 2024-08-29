/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { fireEvent, screen } from '@testing-library/react';
import { forEach } from 'lodash';
import { Route } from 'react-router-dom';

import FilterView from './FilterView';
import { FILTER_TYPE, INTERNAL_PATH, ROOTS } from '../constants';
import { COLORS, SELECTORS } from '../constants/test';
import { populateFolder, populateNodes } from '../mocks/mockUtils';
import { setup, createUploadDataTransfer, createMoveDataTransfer } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import {
	File as FilesFile,
	Folder,
	GetChildrenDocument,
	GetChildrenQuery,
	GetChildrenQueryVariables
} from '../types/graphql/types';
import {
	getChildrenVariables,
	mockFindNodes,
	mockGetNode,
	mockMoveNodes
} from '../utils/resolverMocks';

describe('Filter View', () => {
	describe('Drag and drop', () => {
		test('Drag of files in trash filter shows upload dropzone with dropzone message "not allowed"', async () => {
			const currentFilter = populateNodes(5);
			const localRoot = populateFolder(0, ROOTS.LOCAL_ROOT);
			const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
			forEach(uploadedFiles, (file) => {
				file.parent = localRoot;
			});

			// write local root data in cache as if it was already loaded
			global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(localRoot.id),
				data: {
					getNode: localRoot
				}
			});

			const mocks = {
				Query: {
					findNodes: mockFindNodes(currentFilter),
					getNode: mockGetNode({ getChild: uploadedFiles })
				}
			} satisfies Partial<Resolvers>;

			const dataTransferObj = createUploadDataTransfer(uploadedFiles);

			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
			});

			await screen.findByText(currentFilter[0].name);

			fireEvent.dragEnter(screen.getByText(currentFilter[0].name), {
				dataTransfer: dataTransferObj
			});

			await screen.findByTestId(SELECTORS.dropzone);
			expect(screen.getByText(/You cannot drop an attachment in this area/im)).toBeVisible();

			fireEvent.drop(screen.getByText(currentFilter[0].name), {
				dataTransfer: dataTransferObj
			});

			expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				currentFilter.length
			);
			expect(
				screen.queryByText(/You cannot drop an attachment in this area/m)
			).not.toBeInTheDocument();

			const localRootCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(localRoot.id)
			});
			expect(localRootCachedData?.getNode || null).not.toBeNull();
			expect((localRootCachedData?.getNode as Folder).children.nodes).toHaveLength(0);
		});

		test('Drag of files in a folder node with right permissions inside a trash filter shows disabled upload dropzone of the trash filter', async () => {
			const currentFilter = populateNodes(2);
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_file = true;
			currentFilter.unshift(destinationFolder);
			const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
			forEach(uploadedFiles, (file) => {
				file.parent = destinationFolder;
			});
			const mocks = {
				Query: {
					findNodes: mockFindNodes(currentFilter),
					getNode: mockGetNode({ getChild: uploadedFiles })
				}
			} satisfies Partial<Resolvers>;

			const dataTransferObj = createUploadDataTransfer(uploadedFiles);

			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
			});

			await screen.findByText(destinationFolder.name);

			fireEvent.dragEnter(screen.getByText(destinationFolder.name), {
				dataTransfer: dataTransferObj
			});

			await screen.findByTestId(SELECTORS.dropzone);
			expect(screen.getByText(/You cannot drop an attachment in this area/im)).toBeVisible();

			fireEvent.drop(screen.getByText(destinationFolder.name), {
				dataTransfer: dataTransferObj
			});

			expect(
				screen.queryByText(/You cannot drop an attachment in this area/m)
			).not.toBeInTheDocument();
		});

		test('Drag and drop of a node in a folder with right permissions does not remove the node from current filter list', async () => {
			const currentFilter = populateNodes(2);
			const nodesToDrag = [currentFilter[0]];
			forEach(nodesToDrag, (mockedNode) => {
				mockedNode.permissions.can_write_file = true;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.parent = populateFolder();
				mockedNode.parent.permissions.can_write_folder = true;
				mockedNode.parent.permissions.can_write_file = true;
			});
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			currentFilter.unshift(destinationFolder);

			const mocks = {
				Query: {
					findNodes: mockFindNodes(currentFilter)
				},
				Mutation: {
					moveNodes: mockMoveNodes(
						nodesToDrag.map((node) => ({ ...node, parent: destinationFolder }))
					)
				}
			} satisfies Partial<Resolvers>;

			const dataTransfer = createMoveDataTransfer();

			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
			});

			const itemToDrag = await screen.findByText(nodesToDrag[0].name);
			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			// drag and drop on folder with permissions
			const destinationItem = screen.getByText(destinationFolder.name);
			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
			await screen.findByTestId(SELECTORS.dropzone);
			fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
			await screen.findByText(/item moved/i);
			expect(screen.getByText(nodesToDrag[0].name)).toBeVisible();
			expect(screen.getByText(nodesToDrag[0].name)).toHaveStyle({
				color: COLORS.text.regular
			});
		});
	});
});
