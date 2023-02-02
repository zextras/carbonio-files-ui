/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { forEach, map } from 'lodash';
import { graphql } from 'msw';
import { Route } from 'react-router-dom';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import server from '../../mocks/server';
import { FILTER_TYPE, INTERNAL_PATH, ROOTS, TIMERS } from '../constants';
import { SELECTORS } from '../constants/test';
import { populateFolder, populateNodes } from '../mocks/mockUtils';
import {
	File as FilesFile,
	Folder,
	GetChildQuery,
	GetChildQueryVariables,
	GetChildrenQuery,
	GetChildrenQueryVariables,
	Maybe
} from '../types/graphql/types';
import {
	getChildrenVariables,
	getFindNodesVariables,
	mockFindNodes,
	mockGetChildren,
	mockMoveNodes
} from '../utils/mockUtils';
import { setup, selectNodes, createDataTransfer } from '../utils/testUtils';
import FilterView from './FilterView';

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest.fn(),
		removeCreateOptions: jest.fn()
	})
}));

describe('Filter View', () => {
	describe('Drag and drop', () => {
		test('Drag of files in a filter shows upload dropzone with dropzone message. Drop triggers upload in local root', async () => {
			const currentFilter = populateNodes(5, 'File');
			const localRoot = populateFolder(0, ROOTS.LOCAL_ROOT);
			const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
			forEach(uploadedFiles, (file) => {
				file.parent = localRoot;
			});
			let reqIndex = 0;

			// write local root data in cache as if it was already loaded
			const getChildrenMockedQuery = mockGetChildren(getChildrenVariables(localRoot.id), localRoot);
			global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				...getChildrenMockedQuery.request,
				data: {
					getNode: localRoot
				}
			});

			server.use(
				graphql.query<GetChildQuery, GetChildQueryVariables>('getChild', (req, res, ctx) => {
					const { node_id: id } = req.variables;
					const result = (reqIndex < uploadedFiles.length && uploadedFiles[reqIndex]) || null;
					if (result) {
						result.id = id;
						reqIndex += 1;
					}
					return res(ctx.data({ getNode: result }));
				})
			);

			const mocks = [
				mockFindNodes(
					getFindNodesVariables({
						shared_with_me: true,
						folder_id: ROOTS.LOCAL_ROOT,
						cascade: true,
						direct_share: true
					}),
					currentFilter
				)
			];

			const dataTransferObj = createDataTransfer(uploadedFiles);

			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedWithMe}`]
			});

			await screen.findByText(currentFilter[0].name);

			fireEvent.dragEnter(screen.getByText(currentFilter[0].name), {
				dataTransfer: dataTransferObj
			});

			await screen.findByTestId('dropzone-overlay');
			expect(
				screen.getByText(/Drop here your attachments to quick-add them to your Home/m)
			).toBeVisible();

			fireEvent.drop(screen.getByText(currentFilter[0].name), {
				dataTransfer: dataTransferObj
			});

			await screen.findByText(/upload occurred in Files' home/i);

			expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(
				currentFilter.length
			);
			expect(screen.queryByText(/Drop here your attachments/m)).not.toBeInTheDocument();

			await waitFor(() => {
				const localRootCachedData = global.apolloClient.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>(getChildrenMockedQuery.request);
				return expect(
					(localRootCachedData?.getNode as Maybe<Folder> | undefined)?.children.nodes || []
				).toHaveLength(uploadedFiles.length);
			});
		});

		test('Drag of files in trash filter shows upload dropzone with dropzone message "not allowed"', async () => {
			const currentFilter = populateNodes(5);
			const localRoot = populateFolder(0, ROOTS.LOCAL_ROOT);
			const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
			forEach(uploadedFiles, (file) => {
				file.parent = localRoot;
			});
			let reqIndex = 0;

			// write local root data in cache as if it was already loaded
			const getChildrenMockedQuery = mockGetChildren(getChildrenVariables(localRoot.id), localRoot);
			global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				...getChildrenMockedQuery.request,
				data: {
					getNode: localRoot
				}
			});

			server.use(
				graphql.query<GetChildQuery, GetChildQueryVariables>('getChild', (req, res, ctx) => {
					const { node_id: id } = req.variables;
					const result = (reqIndex < uploadedFiles.length && uploadedFiles[reqIndex]) || null;
					if (result) {
						result.id = id;
						reqIndex += 1;
					}
					return res(ctx.data({ getNode: result }));
				})
			);
			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ shared_with_me: false, folder_id: ROOTS.TRASH, cascade: false }),
					currentFilter
				)
			];

			const dataTransferObj = createDataTransfer(uploadedFiles);

			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
			});

			await screen.findByText(currentFilter[0].name);

			fireEvent.dragEnter(screen.getByText(currentFilter[0].name), {
				dataTransfer: dataTransferObj
			});

			await screen.findByTestId('dropzone-overlay');
			expect(screen.getByText(/You cannot drop an attachment in this area/im)).toBeVisible();

			fireEvent.drop(screen.getByText(currentFilter[0].name), {
				dataTransfer: dataTransferObj
			});

			expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(
				currentFilter.length
			);
			expect(
				screen.queryByText(/You cannot drop an attachment in this area/m)
			).not.toBeInTheDocument();

			expect(reqIndex).toBe(0);
			const localRootCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>(getChildrenMockedQuery.request);
			expect(localRootCachedData?.getNode || null).not.toBeNull();
			expect((localRootCachedData?.getNode as Folder).children.nodes).toHaveLength(0);
		});

		test('Drag of files in a folder node with right permissions inside a filter shows upload dropzone of the list item. Drop triggers upload in list item folder', async () => {
			const currentFilter = populateNodes(2);
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_file = true;
			currentFilter.push(destinationFolder);
			const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
			forEach(uploadedFiles, (file) => {
				file.parent = destinationFolder;
			});
			let reqIndex = 0;

			server.use(
				graphql.query<GetChildQuery, GetChildQueryVariables>('getChild', (req, res, ctx) => {
					const { node_id: id } = req.variables;
					const result = (reqIndex < uploadedFiles.length && uploadedFiles[reqIndex]) || null;
					if (result) {
						result.id = id;
						reqIndex += 1;
					}
					return res(ctx.data({ getNode: result || null }));
				})
			);
			const mocks = [
				mockFindNodes(
					getFindNodesVariables({
						shared_with_me: true,
						folder_id: ROOTS.LOCAL_ROOT,
						cascade: true,
						direct_share: true
					}),
					currentFilter
				)
			];

			const dataTransferObj = createDataTransfer(uploadedFiles);

			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedWithMe}`]
			});

			await screen.findByText(destinationFolder.name);

			fireEvent.dragEnter(screen.getByText(destinationFolder.name), {
				dataTransfer: dataTransferObj
			});

			await screen.findByTestId('dropzone-overlay');
			expect(
				screen.queryByText(/Drop here your attachments to quick-add them to this folder/m)
			).not.toBeInTheDocument();

			fireEvent.drop(screen.getByText(destinationFolder.name), {
				dataTransfer: dataTransferObj
			});

			await screen.findByText(new RegExp(`Upload occurred in ${destinationFolder.name}`, 'i'));
			expect(screen.queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
		});

		test('Drag of files in a folder node without right permissions inside a filter shows upload dropzone of the list item. Drop does nothing', async () => {
			const currentFilter = populateNodes(2);
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_file = false;
			currentFilter.push(destinationFolder);
			const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
			forEach(uploadedFiles, (file) => {
				file.parent = destinationFolder;
			});
			let reqIndex = 0;

			server.use(
				graphql.query<GetChildQuery, GetChildQueryVariables>('getChild', (req, res, ctx) => {
					const { node_id: id } = req.variables;
					const result = (reqIndex < uploadedFiles.length && uploadedFiles[reqIndex]) || null;
					if (result) {
						result.id = id;
						reqIndex += 1;
					}
					return res(ctx.data({ getNode: result }));
				})
			);
			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ flagged: true, cascade: true, folder_id: ROOTS.LOCAL_ROOT }),
					currentFilter
				)
			];

			const dataTransferObj = createDataTransfer(uploadedFiles);

			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
			});

			await screen.findByText(destinationFolder.name);

			fireEvent.dragEnter(screen.getByText(destinationFolder.name), {
				dataTransfer: dataTransferObj
			});

			await screen.findByTestId('dropzone-overlay');
			expect(
				screen.queryByText(/Drop here your attachments to quick-add them to this folder/m)
			).not.toBeInTheDocument();

			fireEvent.drop(screen.getByText(destinationFolder.name), {
				dataTransfer: dataTransferObj
			});

			expect(screen.queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
			expect(screen.queryByText(/upload occurred/i)).not.toBeInTheDocument();
			expect(reqIndex).toBe(0);
		});

		test('Drag of files in a folder node with right permissions inside a trash filter shows disabled upload dropzone of the trash filter', async () => {
			const currentFilter = populateNodes(2);
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_file = true;
			currentFilter.push(destinationFolder);
			const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
			forEach(uploadedFiles, (file) => {
				file.parent = destinationFolder;
			});
			let reqIndex = 0;

			server.use(
				graphql.query<GetChildQuery, GetChildQueryVariables>('getChild', (req, res, ctx) => {
					const { node_id: id } = req.variables;
					const result = (reqIndex < uploadedFiles.length && uploadedFiles[reqIndex]) || null;
					if (result) {
						result.id = id;
						reqIndex += 1;
					}
					return res(ctx.data({ getNode: result }));
				})
			);
			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ folder_id: ROOTS.TRASH, cascade: false, shared_with_me: false }),
					currentFilter
				)
			];

			const dataTransferObj = createDataTransfer(uploadedFiles);

			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
			});

			await screen.findByText(destinationFolder.name);

			fireEvent.dragEnter(screen.getByText(destinationFolder.name), {
				dataTransfer: dataTransferObj
			});

			await screen.findByTestId('dropzone-overlay');
			expect(screen.getByText(/You cannot drop an attachment in this area/im)).toBeVisible();

			fireEvent.drop(screen.getByText(destinationFolder.name), {
				dataTransfer: dataTransferObj
			});

			expect(
				screen.queryByText(/You cannot drop an attachment in this area/m)
			).not.toBeInTheDocument();
			expect(reqIndex).toBe(0);
		});

		test('Drag of a node marked for deletion is not permitted. Dropzone is not shown', async () => {
			const currentFilter = populateNodes(5);
			const nodesToDrag = [currentFilter[0]];
			forEach(nodesToDrag, (mockedNode) => {
				mockedNode.permissions.can_write_file = true;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.parent = populateFolder();
				mockedNode.parent.permissions.can_write_folder = true;
				mockedNode.parent.permissions.can_write_file = true;
				mockedNode.rootId = ROOTS.TRASH;
			});
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			currentFilter.push(destinationFolder);

			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ shared_with_me: false, folder_id: ROOTS.TRASH, cascade: false }),
					currentFilter
				)
			];

			let dataTransferData: Record<string, string> = {};
			let dataTransferTypes: string[] = [];
			const dataTransfer = (): Partial<DataTransfer> => ({
				setDragImage: jest.fn(),
				setData: jest.fn().mockImplementation((type, data) => {
					dataTransferData[type] = data;
					dataTransferTypes.includes(type) || dataTransferTypes.push(type);
				}),
				getData: jest.fn().mockImplementation((type) => dataTransferData[type]),
				types: dataTransferTypes,
				clearData: jest.fn().mockImplementation(() => {
					dataTransferTypes = [];
					dataTransferData = {};
				})
			});

			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
			});

			const itemToDrag = await screen.findByText(currentFilter[0].name);

			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			forEach(nodesToDrag, (node) => {
				const draggedImage = screen.getAllByText(node.name);
				expect(draggedImage).toHaveLength(2);
				expect(draggedImage[0]).toHaveAttribute('disabled', '');
				expect(draggedImage[1]).not.toHaveAttribute('disabled', '');
			});

			// dropzone is not shown
			const destinationItem = screen.getByText(destinationFolder.name);
			fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
			jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
			expect(screen.queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
			fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
		});

		test('Drag of a node shows move dropzone in other nodes. Dragged node is disabled. Drop triggers move only on folders with right permissions.	Dragged node is not removed from current filter list', async () => {
			const currentFilter = populateNodes(5);
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
			currentFilter.push(destinationFolder);
			const folderWithoutPermission = populateFolder();
			folderWithoutPermission.permissions.can_write_folder = false;
			folderWithoutPermission.permissions.can_write_file = false;
			currentFilter.push(folderWithoutPermission);

			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
					currentFilter
				),
				mockMoveNodes(
					{
						node_ids: map(nodesToDrag, (node) => node.id),
						destination_id: destinationFolder.id
					},
					map(nodesToDrag, (node) => ({ ...node, parent: destinationFolder }))
				)
			];

			let dataTransferData: Record<string, string> = {};
			let dataTransferTypes: string[] = [];
			const dataTransfer = (): Partial<DataTransfer> => ({
				setDragImage: jest.fn(),
				setData: jest.fn().mockImplementation((type, data) => {
					dataTransferData[type] = data;
					dataTransferTypes.includes(type) || dataTransferTypes.push(type);
				}),
				getData: jest.fn().mockImplementation((type) => dataTransferData[type]),
				types: dataTransferTypes,
				clearData: jest.fn().mockImplementation(() => {
					dataTransferTypes = [];
					dataTransferData = {};
				})
			});

			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
			});

			const itemToDrag = await screen.findByText(nodesToDrag[0].name);
			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(itemToDrag, { dataTransfer: dataTransfer() });
			act(() => {
				jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
			});
			// two items are visible for the node, the one in the list is disabled, the other one is the one dragged and is not disabled
			const draggedNodeItems = screen.getAllByText(nodesToDrag[0].name);
			expect(draggedNodeItems).toHaveLength(2);
			expect(draggedNodeItems[0]).toHaveAttribute('disabled', '');
			expect(draggedNodeItems[1]).not.toHaveAttribute('disabled', '');
			// dropzone overlay of the list is shown
			await screen.findByTestId('dropzone-overlay');
			expect(screen.getByTestId('dropzone-overlay')).toBeVisible();
			expect(screen.getByText(/drag&drop mode/i)).toBeVisible();
			expect(screen.getByText(/you cannot drop your items in this area/i)).toBeVisible();
			fireEvent.dragLeave(itemToDrag, { dataTransfer: dataTransfer() });

			// drag and drop on folder without permissions
			const folderWithoutPermissionsItem = screen.getByText(folderWithoutPermission.name);
			fireEvent.dragEnter(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
			await screen.findByTestId('dropzone-overlay');
			expect(screen.getByTestId('dropzone-overlay')).toBeVisible();
			expect(screen.queryByText('Drag&Drop Mode')).not.toBeInTheDocument();
			fireEvent.drop(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });

			expect(screen.queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
			expect(itemToDrag).toBeVisible();
			expect(itemToDrag).not.toHaveAttribute('disabled', '');

			// drag and drop on folder with permissions
			const destinationItem = screen.getByText(destinationFolder.name);
			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
			await screen.findByTestId('dropzone-overlay');
			expect(screen.getByTestId('dropzone-overlay')).toBeVisible();
			expect(screen.queryByText('Drag&Drop Mode')).not.toBeInTheDocument();
			fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
			await screen.findByText(/item moved/i);
			expect(screen.queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
			expect(screen.getByText(nodesToDrag[0].name)).toBeInTheDocument();
			expect(screen.getByText(nodesToDrag[0].name)).toBeVisible();
			expect(screen.getByText(nodesToDrag[0].name)).not.toHaveAttribute('disabled', '');
		});

		test('Drag of a node without move permissions cause no dropzone to be shown', async () => {
			const currentFilter = populateNodes(5);
			const nodesToDrag = [currentFilter[0]];
			forEach(nodesToDrag, (mockedNode) => {
				mockedNode.permissions.can_write_file = false;
				mockedNode.permissions.can_write_folder = false;
				mockedNode.parent = populateFolder();
				mockedNode.parent.permissions.can_write_folder = true;
				mockedNode.parent.permissions.can_write_file = true;
			});
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			currentFilter.push(destinationFolder);
			const folderWithoutPermission = populateFolder();
			folderWithoutPermission.permissions.can_write_folder = false;
			folderWithoutPermission.permissions.can_write_file = false;
			currentFilter.push(folderWithoutPermission);

			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
					currentFilter
				)
			];

			let dataTransferData: Record<string, string> = {};
			let dataTransferTypes: string[] = [];
			const dataTransfer = (): Partial<DataTransfer> => ({
				setDragImage: jest.fn(),
				setData: jest.fn().mockImplementation((type, data) => {
					dataTransferData[type] = data;
					dataTransferTypes.includes(type) || dataTransferTypes.push(type);
				}),
				getData: jest.fn().mockImplementation((type) => dataTransferData[type]),
				types: dataTransferTypes,
				clearData: jest.fn().mockImplementation(() => {
					dataTransferTypes = [];
					dataTransferData = {};
				})
			});

			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
			});

			const itemToDrag = await screen.findByText(nodesToDrag[0].name);
			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(itemToDrag, { dataTransfer: dataTransfer() });
			jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
			// two items are visible for the node, the one in the list is disabled, the other one is the one dragged and is not disabled
			const draggedNodeItems = screen.getAllByText(nodesToDrag[0].name);
			expect(draggedNodeItems).toHaveLength(2);
			expect(draggedNodeItems[0]).toHaveAttribute('disabled', '');
			expect(draggedNodeItems[1]).not.toHaveAttribute('disabled', '');
			expect(screen.queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
			fireEvent.dragLeave(itemToDrag, { dataTransfer: dataTransfer() });

			// drag and drop on folder without permissions. Overlay is not shown.
			const folderWithoutPermissionsItem = screen.getByText(folderWithoutPermission.name);
			fireEvent.dragEnter(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
			jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
			expect(screen.queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
			fireEvent.drop(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
			expect(itemToDrag).toBeVisible();
			expect(itemToDrag).not.toHaveAttribute('disabled', '');

			// drag and drop on folder with permissions. Overlay is not shown.
			const destinationItem = screen.getByText(destinationFolder.name);
			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
			jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
			expect(screen.queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
			fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
			expect(itemToDrag).toBeVisible();
			expect(itemToDrag).not.toHaveAttribute('disabled', '');
		});

		test('Drag of multiple nodes is not permitted', async () => {
			const currentFilter = populateNodes(5);
			const nodesToDrag = [...currentFilter];
			const parent = populateFolder();
			parent.permissions.can_write_folder = true;
			parent.permissions.can_write_file = true;
			forEach(nodesToDrag, (mockedNode) => {
				mockedNode.permissions.can_write_file = true;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.parent = parent;
			});
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			destinationFolder.parent = parent;
			currentFilter.push(destinationFolder);

			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
					currentFilter
				),
				mockMoveNodes(
					{
						node_ids: map(nodesToDrag, (node) => node.id),
						destination_id: destinationFolder.id
					},
					map(nodesToDrag, (node) => ({ ...node, parent: destinationFolder }))
				)
			];

			let dataTransferData: Record<string, string> = {};
			let dataTransferTypes: string[] = [];
			const dataTransfer = (): Partial<DataTransfer> => ({
				setDragImage: jest.fn(),
				setData: jest.fn().mockImplementation((type, data) => {
					dataTransferData[type] = data;
					dataTransferTypes.includes(type) || dataTransferTypes.push(type);
				}),
				getData: jest.fn().mockImplementation((type) => dataTransferData[type]),
				types: dataTransferTypes,
				clearData: jest.fn().mockImplementation(() => {
					dataTransferTypes = [];
					dataTransferData = {};
				})
			});

			const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
			});

			const itemToDrag = await screen.findByText(nodesToDrag[0].name);
			await selectNodes(
				map(nodesToDrag, (node) => node.id),
				user
			);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodesToDrag.length);

			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			forEach(nodesToDrag, (node) => {
				const draggedImage = screen.getAllByText(node.name);
				expect(draggedImage).toHaveLength(2);
				expect(draggedImage[0]).toHaveAttribute('disabled', '');
				expect(draggedImage[1]).not.toHaveAttribute('disabled', '');
			});

			// dropzone is not shown
			const destinationItem = screen.getByText(destinationFolder.name);
			fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
			jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
			expect(screen.queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
			fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });

			// selection mode stays active
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodesToDrag.length);
		});

		test('Drag of a node in a filter empty space shows disabled dropzone overlay for the list. Drop does nothing', async () => {
			const currentFilter = populateNodes(5);
			const nodesToDrag = [currentFilter[0]];
			forEach(nodesToDrag, (mockedNode) => {
				mockedNode.permissions.can_write_file = true;
				mockedNode.permissions.can_write_folder = true;
				mockedNode.parent = populateFolder();
				mockedNode.parent.permissions.can_write_folder = true;
				mockedNode.parent.permissions.can_write_file = true;
			});

			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
					currentFilter
				)
			];

			let dataTransferData: Record<string, string> = {};
			let dataTransferTypes: string[] = [];
			const dataTransfer = (): Partial<DataTransfer> => ({
				setDragImage: jest.fn(),
				setData: jest.fn().mockImplementation((type, data) => {
					dataTransferData[type] = data;
					dataTransferTypes.includes(type) || dataTransferTypes.push(type);
				}),
				getData: jest.fn().mockImplementation((type) => dataTransferData[type]),
				types: dataTransferTypes,
				clearData: jest.fn().mockImplementation(() => {
					dataTransferTypes = [];
					dataTransferData = {};
				})
			});

			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
			});

			const itemToDrag = await screen.findByText(nodesToDrag[0].name);
			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(itemToDrag, { dataTransfer: dataTransfer() });
			act(() => {
				jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
			});
			// two items are visible for the node, the one in the list is disabled, the other one is the one dragged and is not disabled
			await waitFor(() => expect(screen.getAllByText(nodesToDrag[0].name)).toHaveLength(2));
			const draggedNodeItems = screen.getAllByText(nodesToDrag[0].name);
			expect(draggedNodeItems).toHaveLength(2);
			expect(draggedNodeItems[0]).toHaveAttribute('disabled', '');
			expect(draggedNodeItems[1]).not.toHaveAttribute('disabled', '');
			// dropzone overlay of the list is shown
			await screen.findByTestId('dropzone-overlay');
			expect(screen.getByTestId('dropzone-overlay')).toBeVisible();
			expect(screen.getByText(/drag&drop mode/i)).toBeVisible();
			expect(screen.getByText(/you cannot drop your items in this area/i)).toBeVisible();
			jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
			fireEvent.drop(itemToDrag, { dataTransfer: dataTransfer() });
			fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
			jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
			expect(screen.queryByText(/item moved/i)).not.toBeInTheDocument();
			expect(screen.queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
		});
	});
});
