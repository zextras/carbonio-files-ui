/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { forEach } from 'lodash';
import { http, HttpResponse } from 'msw';

import { List } from './List';
import server from '../../../mocks/server';
import {
	FILTER_TYPE,
	INTERNAL_PATH,
	REST_ENDPOINT,
	ROOTS,
	TIMERS,
	UPLOAD_PATH
} from '../../constants';
import { COLORS, SELECTORS } from '../../constants/test';
import { UploadResponse } from '../../mocks/handleUploadFileRequest';
import { populateFile, populateFolder, populateNodes } from '../../mocks/mockUtils';
import {
	createMoveDataTransfer,
	createUploadDataTransfer,
	screen,
	selectNodes,
	setup
} from '../../tests/utils';
import { Node } from '../../types/common';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { File as FilesFile, Folder, GetChildrenDocument, Maybe } from '../../types/graphql/types';
import {
	getChildrenVariables,
	mockGetNode,
	mockGetPath,
	mockMoveNodes
} from '../../utils/resolverMocks';

jest.mock<typeof import('./VirtualizedNodeListItem')>('./VirtualizedNodeListItem');

describe('List', () => {
	describe('Drag and drop', () => {
		describe('Upload', () => {
			test('Drag of files shows upload dropzone with dropzone message. Drop triggers upload in local root if no folder is passed as prop', async () => {
				const nodes = populateNodes(5, 'File');
				const localRoot = populateFolder(0, ROOTS.LOCAL_ROOT);
				const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
				uploadedFiles.forEach((file) => {
					file.parent = localRoot;
				});
				// write local root data in cache as if it was already loaded
				global.apolloClient.cache.writeQuery({
					query: GetChildrenDocument,
					variables: getChildrenVariables(localRoot.id),
					data: {
						getNode: localRoot
					}
				});

				const mocks = {
					Query: {
						getNode: mockGetNode({ getChild: uploadedFiles })
					}
				} satisfies Partial<Resolvers>;

				const dataTransferObj = createUploadDataTransfer(uploadedFiles);

				setup(<List nodes={nodes} mainList emptyListMessage={'Empty list'} />, { mocks });

				await screen.findByText(nodes[0].name);

				fireEvent.dragEnter(screen.getByText(nodes[0].name), {
					dataTransfer: dataTransferObj
				});

				await screen.findByTestId(SELECTORS.dropzone);
				expect(
					screen.getByText(/Drop here your attachments to quick-add them to your Home/m)
				).toBeVisible();

				fireEvent.drop(screen.getByText(nodes[0].name), {
					dataTransfer: dataTransferObj
				});

				await screen.findByText(/upload occurred in Files' home/i);

				expect(screen.queryByText(/Drop here your attachments/m)).not.toBeInTheDocument();

				await jest.advanceTimersToNextTimerAsync();

				await waitFor(() => {
					const localRootCachedData = global.apolloClient.readQuery({
						query: GetChildrenDocument,
						variables: getChildrenVariables(localRoot.id)
					});
					return expect(
						(localRootCachedData?.getNode as Maybe<Folder> | undefined)?.children.nodes || []
					).toHaveLength(uploadedFiles.length);
				});
			});

			test('Drag of files shows upload dropzone with dropzone message. Drop triggers upload in the current folder', async () => {
				const nodes = populateNodes(5, 'File');
				const folder = populateFolder();
				folder.permissions.can_write_file = true;
				folder.permissions.can_write_folder = true;
				const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
				uploadedFiles.forEach((file) => {
					file.parent = folder;
				});
				const mocks = {
					Query: {
						getNode: mockGetNode({ getChild: uploadedFiles })
					}
				} satisfies Partial<Resolvers>;
				const dataTransferObj = createUploadDataTransfer(uploadedFiles);

				setup(
					<List nodes={nodes} mainList emptyListMessage={'Empty list'} folderId={folder.id} />,
					{ mocks }
				);

				await screen.findByText(nodes[0].name);
				fireEvent.dragEnter(screen.getByText(nodes[0].name), {
					dataTransfer: dataTransferObj
				});
				await screen.findByTestId(SELECTORS.dropzone);
				expect(
					screen.getByText(/Drop here your attachments to quick-add them to this folder/i)
				).toBeVisible();
				fireEvent.drop(screen.getByText(nodes[0].name), {
					dataTransfer: dataTransferObj
				});
				expect(screen.queryByText(/Drop here your attachments/m)).not.toBeInTheDocument();
				await jest.advanceTimersToNextTimerAsync();
			});

			test('Drag of files in a folder node with right permissions shows upload dropzone of the list item. Drop triggers upload in list item folder', async () => {
				const nodes = populateNodes(2);
				const destinationFolder = populateFolder();
				destinationFolder.permissions.can_write_file = true;
				nodes.unshift(destinationFolder);
				const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
				uploadedFiles.forEach((file) => {
					file.parent = destinationFolder;
				});
				const mocks = {
					Query: {
						getNode: mockGetNode({ getChild: uploadedFiles })
					}
				} satisfies Partial<Resolvers>;
				const dataTransferObj = createUploadDataTransfer(uploadedFiles);

				setup(<List nodes={nodes} mainList emptyListMessage={'Emtpy list'} />, { mocks });

				await screen.findByText(destinationFolder.name);

				fireEvent.dragEnter(screen.getByText(destinationFolder.name), {
					dataTransfer: dataTransferObj
				});

				await screen.findByTestId(SELECTORS.dropzone);
				expect(
					screen.queryByText(/Drop here your attachments to quick-add them to this folder/m)
				).not.toBeInTheDocument();

				fireEvent.drop(screen.getByText(destinationFolder.name), {
					dataTransfer: dataTransferObj
				});

				await screen.findByText(new RegExp(`Upload occurred in ${destinationFolder.name}`, 'i'));
				expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
			});

			test('Drag of files in a folder node without right permissions shows upload dropzone of the list item. Drop does nothing', async () => {
				const nodes = populateNodes(2);
				const destinationFolder = populateFolder();
				destinationFolder.permissions.can_write_file = false;
				nodes.unshift(destinationFolder);
				const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
				forEach(uploadedFiles, (file) => {
					file.parent = destinationFolder;
				});
				const mocks = {
					Query: {
						getNode: mockGetNode({ getChild: uploadedFiles })
					}
				} satisfies Partial<Resolvers>;

				const dataTransferObj = createUploadDataTransfer(uploadedFiles);

				setup(<List nodes={nodes} mainList emptyListMessage={'Empty list'} />, {
					mocks
				});

				await screen.findByText(destinationFolder.name);

				fireEvent.dragEnter(screen.getByText(destinationFolder.name), {
					dataTransfer: dataTransferObj
				});

				await screen.findByTestId(SELECTORS.dropzone);
				expect(
					screen.queryByText(/Drop here your attachments to quick-add them to this folder/m)
				).not.toBeInTheDocument();

				fireEvent.drop(screen.getByText(destinationFolder.name), {
					dataTransfer: dataTransferObj
				});

				expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
				expect(screen.queryByText(/upload occurred/i)).not.toBeInTheDocument();
			});

			test('Drag of files in a file node inside a list with right permissions shows upload dropzone of the list. Drop trigger upload in the current folder', async () => {
				const currentFolder = populateFolder(2);
				currentFolder.permissions.can_write_file = true;
				const destinationFile = populateFile();
				destinationFile.permissions.can_write_file = true;
				destinationFile.parent = { ...currentFolder, children: { nodes: [] } } as Folder;
				currentFolder.children.nodes.push(destinationFile);
				const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
				uploadedFiles.forEach((file) => {
					file.parent = currentFolder;
				});

				let requestDestinationFolder: string | null = null;
				server.use(
					http.post<never, File, UploadResponse>(`${REST_ENDPOINT}${UPLOAD_PATH}`, async (info) => {
						requestDestinationFolder = info.request.headers.get('ParentId');
						return HttpResponse.json({
							nodeId: faker.string.uuid()
						});
					})
				);
				const mocks = {
					Query: {
						getPath: mockGetPath([currentFolder])
					}
				} satisfies Partial<Resolvers>;

				const dataTransferObj = createUploadDataTransfer(uploadedFiles);

				setup(
					<List
						nodes={currentFolder.children.nodes as Node[]}
						mainList
						emptyListMessage={'Empty list'}
						folderId={currentFolder.id}
					/>,
					{
						mocks
					}
				);

				await screen.findByText(destinationFile.name);

				fireEvent.dragEnter(screen.getByText(destinationFile.name), {
					dataTransfer: dataTransferObj
				});

				await screen.findByTestId(SELECTORS.dropzone);
				expect(
					screen.getByText(/Drop here your attachments to quick-add them to this folder/i)
				).toBeVisible();

				fireEvent.drop(screen.getByText(destinationFile.name), {
					dataTransfer: dataTransferObj
				});

				await act(async () => {
					await jest.advanceTimersToNextTimerAsync();
				});
				await waitFor(() => expect(requestDestinationFolder).toBe(currentFolder.id));
				expect(
					screen.queryByText(/Drop here your attachments to quick-add them to this folder/m)
				).not.toBeInTheDocument();
			});
		});

		describe('Move', () => {
			test('Drag of a node marked for deletion is permitted and shows disabled dropzone on every destination', async () => {
				const nodes = populateNodes(5);
				const nodesToDrag = [nodes[0]];
				nodesToDrag.forEach((mockedNode) => {
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
				nodes.unshift(destinationFolder);

				const dataTransfer = createMoveDataTransfer();

				const mocks = { Mutation: { moveNodes: jest.fn() } } satisfies Resolvers;

				setup(<List nodes={nodes} mainList emptyListMessage={'Empty list'} />, {
					mocks
				});

				const itemToDrag = await screen.findByText(nodes[1].name);
				fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
				const destinationItem = screen.getByText(destinationFolder.name);
				fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
				act(() => {
					jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
				});
				expect(screen.getByTestId(SELECTORS.dropzone)).toBeVisible();
				fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
				fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
				expect(mocks.Mutation.moveNodes).not.toHaveBeenCalled();
			});

			test('Drag of a node shows move dropzone in other nodes. Dragged node is disabled', async () => {
				const nodes = populateNodes(5);
				const nodesToDrag = [nodes[0]];
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
				nodes.unshift(destinationFolder);

				const mocks = {} satisfies Partial<Resolvers>;

				const dataTransfer = createMoveDataTransfer();

				setup(<List nodes={nodes} mainList emptyListMessage={'Empty folder'} />, {
					mocks
				});

				const itemToDrag = await screen.findByText(nodesToDrag[0].name);
				fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
				// two items are visible for the node, the one in the list is disabled, the other one is the one dragged and is not disabled
				const draggedNodeItems = screen.getAllByText(nodesToDrag[0].name);
				expect(draggedNodeItems).toHaveLength(2);
				expect(draggedNodeItems[0]).toHaveStyle({
					color: COLORS.text.disabled
				});
				expect(draggedNodeItems[1]).toHaveStyle({
					color: COLORS.text.regular
				});
				// drag on folder
				const folderItem = screen.getByText(destinationFolder.name);
				fireEvent.dragEnter(folderItem, { dataTransfer: dataTransfer() });
				expect(await screen.findByTestId(SELECTORS.dropzone)).toBeVisible();
				expect(screen.queryByText('Drag&Drop Mode')).not.toBeInTheDocument();
				fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
			});

			test('Drop of a node on folder without permissions does nothing', async () => {
				const nodes = populateNodes(5);
				const nodesToDrag = [nodes[0]];
				forEach(nodesToDrag, (mockedNode) => {
					mockedNode.permissions.can_write_file = true;
					mockedNode.permissions.can_write_folder = true;
					mockedNode.parent = populateFolder();
					mockedNode.parent.permissions.can_write_folder = true;
					mockedNode.parent.permissions.can_write_file = true;
				});
				const folderWithoutPermission = populateFolder();
				folderWithoutPermission.permissions.can_write_folder = false;
				folderWithoutPermission.permissions.can_write_file = false;
				nodes.unshift(folderWithoutPermission);

				const mocks = {
					Mutation: {
						moveNodes: jest.fn()
					}
				} satisfies Partial<Resolvers>;

				const dataTransfer = createMoveDataTransfer();

				setup(<List nodes={nodes} mainList emptyListMessage={'Empty list'} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				const itemToDrag = await screen.findByText(nodesToDrag[0].name);
				fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
				// drag and drop on folder without permissions
				const folderWithoutPermissionsItem = screen.getByText(folderWithoutPermission.name);
				fireEvent.dragEnter(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
				await screen.findByTestId(SELECTORS.dropzone);
				expect(screen.getByTestId(SELECTORS.dropzone)).toBeVisible();
				expect(screen.queryByText('Drag&Drop Mode')).not.toBeInTheDocument();
				fireEvent.drop(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
				fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
				expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
				expect(itemToDrag).toBeVisible();
				expect(itemToDrag).toHaveStyle({
					color: COLORS.text.regular
				});
			});

			test('Drop of a node triggers move on folders with right permissions.', async () => {
				const nodes = populateNodes(5);
				const nodesToDrag = [nodes[0]];
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
				nodes.unshift(destinationFolder);

				const mocks = {
					Mutation: {
						moveNodes: mockMoveNodes(
							nodesToDrag.map((node) => ({ ...node, parent: destinationFolder }))
						)
					}
				} satisfies Partial<Resolvers>;

				const dataTransfer = createMoveDataTransfer();

				setup(<List nodes={nodes} mainList emptyListMessage={'Empty list'} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				const itemToDrag = await screen.findByText(nodesToDrag[0].name);
				// drag and drop on folder with permissions
				const destinationItem = screen.getByText(destinationFolder.name);
				fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
				fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
				expect(await screen.findByTestId(SELECTORS.dropzone)).toBeVisible();
				fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
				fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
				await screen.findByText(/item moved/i);
				expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
				expect(screen.getByText(nodesToDrag[0].name)).toBeVisible();
				expect(screen.getByText(nodesToDrag[0].name)).toHaveStyle({
					color: COLORS.text.regular
				});
			});

			test('Drag of a node without move permissions shows disabled dropzone on every destination', async () => {
				const nodes = populateNodes(1);
				const nodesToDrag = [nodes[0]];
				nodesToDrag.forEach((mockedNode) => {
					mockedNode.permissions.can_write_file = false;
					mockedNode.permissions.can_write_folder = false;
					mockedNode.parent = populateFolder();
					mockedNode.parent.permissions.can_write_folder = true;
					mockedNode.parent.permissions.can_write_file = true;
				});
				const destinationFolder = populateFolder();
				destinationFolder.permissions.can_write_folder = true;
				destinationFolder.permissions.can_write_file = true;
				nodes.unshift(destinationFolder);

				const dataTransfer = createMoveDataTransfer();

				const mocks = { Mutation: { moveNodes: jest.fn() } } satisfies Resolvers;
				setup(<List nodes={nodes} mainList emptyListMessage={'Empty list'} />, {
					mocks
				});

				const itemToDrag = await screen.findByText(nodesToDrag[0].name);
				const destinationItem = screen.getByText(destinationFolder.name);
				fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
				// drag and drop on folder with permissions. Overlay is not shown.
				fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
				act(() => {
					jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
				});
				expect(screen.getByTestId(SELECTORS.dropzone)).toBeVisible();
				fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
				fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
				expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
				expect(mocks.Mutation.moveNodes).not.toHaveBeenCalled();
			});

			test('Drag of a node in the empty space shows disabled dropzone overlay for the list. Drop does nothing', async () => {
				const nodes = populateNodes(1);
				const nodesToDrag = [nodes[0]];
				nodesToDrag.forEach((mockedNode) => {
					mockedNode.permissions.can_write_file = true;
					mockedNode.permissions.can_write_folder = true;
					mockedNode.parent = populateFolder();
					mockedNode.parent.permissions.can_write_folder = true;
					mockedNode.parent.permissions.can_write_file = true;
				});

				const dataTransfer = createMoveDataTransfer();

				setup(<List nodes={nodes} mainList emptyListMessage={'Empty list'} />, {
					mocks: {}
				});

				const itemToDrag = await screen.findByText(nodesToDrag[0].name);
				fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
				fireEvent.dragEnter(itemToDrag, { dataTransfer: dataTransfer() });
				act(() => {
					jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
				});
				// dropzone overlay of the list is shown
				expect(await screen.findByTestId(SELECTORS.dropzone)).toBeVisible();
				expect(screen.getByText(/drag&drop mode/i)).toBeVisible();
				expect(screen.getByText(/you cannot drop your items in this area/i)).toBeVisible();
				fireEvent.drop(itemToDrag, { dataTransfer: dataTransfer() });
				fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
				expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
			});

			test('Drag of multiple nodes is permitted. All dragged nodes are disabled', async () => {
				const nodes = populateNodes(2);
				const nodesToDrag = [...nodes];
				const parent = populateFolder();
				parent.permissions.can_write_folder = true;
				parent.permissions.can_write_file = true;
				nodesToDrag.forEach((mockedNode) => {
					mockedNode.permissions.can_write_file = true;
					mockedNode.permissions.can_write_folder = true;
					mockedNode.parent = parent;
				});
				const destinationFolder = populateFolder();
				destinationFolder.permissions.can_write_folder = true;
				destinationFolder.permissions.can_write_file = true;
				destinationFolder.parent = parent;
				nodes.unshift(destinationFolder);

				const mocks = {
					Mutation: {
						moveNodes: mockMoveNodes(
							nodesToDrag.map((node) => ({ ...node, parent: destinationFolder }))
						)
					}
				} satisfies Partial<Resolvers>;

				const dataTransfer = createMoveDataTransfer();

				const { user } = setup(<List nodes={nodes} mainList emptyListMessage={'Empty list'} />, {
					mocks
				});

				const itemToDrag = await screen.findByText(nodesToDrag[1].name);
				await selectNodes(
					nodesToDrag.map((node) => node.id),
					user
				);
				const destinationItem = screen.getByText(destinationFolder.name);
				fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
				fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
				nodesToDrag.forEach((node) => {
					const draggedImage = screen.getAllByText(node.name);
					expect(draggedImage).toHaveLength(2);
					expect(draggedImage[0]).toHaveStyle({ color: COLORS.text.disabled });
					expect(draggedImage[1]).toHaveStyle({ color: COLORS.text.regular });
				});
				act(() => {
					jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
				});
				expect(screen.getByTestId(SELECTORS.dropzone)).toBeVisible();
				fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
				fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
				expect(await screen.findByText(/item moved/i)).toBeVisible();
				// selection mode is exited
				expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			});
		});
	});
});
