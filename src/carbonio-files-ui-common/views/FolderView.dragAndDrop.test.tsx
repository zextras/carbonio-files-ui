/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import {
	act,
	fireEvent,
	screen,
	waitFor,
	waitForElementToBeRemoved,
	within
} from '@testing-library/react';
import { forEach, map, find } from 'lodash';
import { graphql, HttpResponse } from 'msw';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import server from '../../mocks/server';
import { TIMERS } from '../constants';
import { COLORS, ICON_REGEXP, SELECTORS } from '../constants/test';
import {
	populateFile,
	populateFolder,
	populateNode,
	populateNodePage,
	populateNodes,
	populateParents,
	populateUser
} from '../mocks/mockUtils';
import {
	setup,
	selectNodes,
	createUploadDataTransfer,
	createMoveDataTransfer
} from '../tests/utils';
import { Node } from '../types/common';
import { Resolvers } from '../types/graphql/resolvers-types';
import {
	File as FilesFile,
	Folder,
	GetChildDocument,
	GetChildQuery,
	GetChildQueryVariables
} from '../types/graphql/types';
import { mockGetNode, mockGetPath, mockMoveNodes } from '../utils/resolverMocks';

jest.mock<typeof import('./components/Displayer')>('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): React.JSX.Element => (
		<div data-testid="displayer">
			{props.translationKey}:{props.icons}
		</div>
	)
}));

describe('Drag and drop', () => {
	test('Drag of files in a folder with right permissions shows upload dropzone with dropzone message. Drop triggers upload in current folder', async () => {
		const currentFolder = populateFolder();
		currentFolder.permissions.can_write_file = true;
		const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
		forEach(uploadedFiles, (file) => {
			file.parent = currentFolder;
		});
		let reqIndex = 0;
		const mockedGetChildHandler = jest.fn();

		server.use(
			graphql.query<GetChildQuery, GetChildQueryVariables>(GetChildDocument, ({ variables }) => {
				const { node_id: id } = variables;
				const result = (reqIndex < uploadedFiles.length && uploadedFiles[reqIndex]) || null;
				if (result) {
					result.id = id;
					reqIndex += 1;
				}
				mockedGetChildHandler(id);
				return HttpResponse.json({ data: { getNode: result } });
			})
		);
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
			}
		} satisfies Partial<Resolvers>;

		const dataTransferObj = createUploadDataTransfer(uploadedFiles);

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		await screen.findByText(/nothing here/i);

		fireEvent.dragEnter(screen.getByText(/nothing here/i), {
			dataTransfer: dataTransferObj
		});

		await screen.findByTestId(SELECTORS.dropzone);
		expect(
			screen.getByText(/Drop here your attachments to quick-add them to this folder/m)
		).toBeVisible();

		fireEvent.drop(screen.getByText(/nothing here/i), {
			dataTransfer: dataTransferObj
		});

		await act(async () => {
			await jest.advanceTimersToNextTimerAsync();
		});
		await waitFor(() => expect(mockedGetChildHandler).toHaveBeenCalledTimes(uploadedFiles.length));
		await screen.findByText(uploadedFiles[0].name);
		await screen.findByText(uploadedFiles[1].name);
		expect(screen.getByText(uploadedFiles[0].name)).toBeVisible();
		expect(screen.getByText(uploadedFiles[1].name)).toBeVisible();
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFolder.children.nodes.length + uploadedFiles.length
		);
		expect(
			screen.queryByText(/Drop here your attachments to quick-add them to this folder/m)
		).not.toBeInTheDocument();
	});

	test('Drag of files in a folder without right permissions shows upload dropzone "not allowed" message. Drop does nothing', async () => {
		const currentFolder = populateFolder();
		currentFolder.permissions.can_write_file = false;
		const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
		forEach(uploadedFiles, (file) => {
			file.parent = currentFolder;
		});
		let reqIndex = 0;

		const mockedGetChildHandler = jest.fn();

		server.use(
			graphql.query<GetChildQuery, GetChildQueryVariables>(GetChildDocument, ({ variables }) => {
				const { node_id: id } = variables;
				const result = (reqIndex < uploadedFiles.length && uploadedFiles[reqIndex]) || null;
				if (result) {
					result.id = id;
					reqIndex += 1;
				}
				mockedGetChildHandler(id);
				return HttpResponse.json({ data: { getNode: result } });
			})
		);
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
			}
		} satisfies Partial<Resolvers>;

		const dataTransferObj = createUploadDataTransfer(uploadedFiles);

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		await screen.findByText(/nothing here/i);

		fireEvent.dragEnter(screen.getByText(/nothing here/i), {
			dataTransfer: dataTransferObj
		});

		await screen.findByTestId(SELECTORS.dropzone);
		expect(screen.getByText(/You cannot drop an attachment in this area/m)).toBeVisible();

		fireEvent.drop(screen.getByText(/nothing here/i), {
			dataTransfer: dataTransferObj
		});

		expect(screen.queryByText(uploadedFiles[0].name)).not.toBeInTheDocument();
		expect(screen.queryByText(uploadedFiles[1].name)).not.toBeInTheDocument();
		expect(screen.queryByTestId(SELECTORS.nodeItem(), { exact: false })).not.toBeInTheDocument();
		expect(
			screen.queryByText(/You cannot drop an attachment in this area/m)
		).not.toBeInTheDocument();
		expect(mockedGetChildHandler).not.toHaveBeenCalled();
	});

	test('Drag of files in a folder node with right permissions inside a list shows upload dropzone of the list item. Drop triggers upload in list item folder', async () => {
		const currentFolder = populateFolder(2);
		currentFolder.permissions.can_write_file = true;
		const destinationFolder = populateFolder();
		destinationFolder.permissions.can_write_file = true;
		destinationFolder.parent = { ...currentFolder, children: { nodes: [] } } as Folder;
		currentFolder.children.nodes.push(destinationFolder);
		const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
		forEach(uploadedFiles, (file) => {
			file.parent = destinationFolder;
		});
		let reqIndex = 0;

		server.use(
			graphql.query<GetChildQuery, GetChildQueryVariables>(GetChildDocument, ({ variables }) => {
				const { node_id: id } = variables;
				const result = (reqIndex < uploadedFiles.length && uploadedFiles[reqIndex]) || null;
				if (result) {
					result.id = id;
					reqIndex += 1;
				}
				return HttpResponse.json({ data: { getNode: result } });
			})
		);
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
			}
		} satisfies Partial<Resolvers>;

		const dataTransferObj = createUploadDataTransfer(uploadedFiles);

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
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

		await screen.findByText(new RegExp(`Upload occurred in ${destinationFolder.name}`, 'i'));
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);
		expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
	});

	test('Drag of files in a folder node without right permissions inside a list shows upload dropzone of the list item. Drop does nothing', async () => {
		const currentFolder = populateFolder(2);
		currentFolder.permissions.can_write_file = true;
		const destinationFolder = populateFolder();
		destinationFolder.permissions.can_write_file = false;
		destinationFolder.parent = { ...currentFolder, children: { nodes: [] } } as Folder;
		currentFolder.children.nodes.push(destinationFolder);
		const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
		forEach(uploadedFiles, (file) => {
			file.parent = destinationFolder;
		});
		let reqIndex = 0;

		server.use(
			graphql.query<GetChildQuery, GetChildQueryVariables>(GetChildDocument, ({ variables }) => {
				const { node_id: id } = variables;
				const result = (reqIndex < uploadedFiles.length && uploadedFiles[reqIndex]) || null;
				if (result) {
					result.id = id;
					reqIndex += 1;
				}
				return HttpResponse.json({ data: { getNode: result } });
			})
		);
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
			}
		} satisfies Partial<Resolvers>;

		const dataTransferObj = createUploadDataTransfer(uploadedFiles);

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
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
		expect(screen.queryByText(/Upload occurred/i)).not.toBeInTheDocument();
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);
		expect(reqIndex).toBe(0);
	});

	test('Drag of files in a file node inside a list with right permissions shows upload dropzone of the list. Drop trigger upload in the current folder', async () => {
		const currentFolder = populateFolder(2);
		currentFolder.permissions.can_write_file = true;
		const destinationFile = populateFile();
		destinationFile.permissions.can_write_file = true;
		destinationFile.parent = { ...currentFolder, children: { nodes: [] } } as Folder;
		currentFolder.children.nodes.push(destinationFile);
		const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
		forEach(uploadedFiles, (file) => {
			file.parent = currentFolder;
		});
		let reqIndex = 0;

		const mockedGetChildHandler = jest.fn();

		server.use(
			graphql.query<GetChildQuery, GetChildQueryVariables>(GetChildDocument, ({ variables }) => {
				const { node_id: id } = variables;
				const result = (reqIndex < uploadedFiles.length && uploadedFiles[reqIndex]) || null;
				if (result) {
					result.id = id;
					reqIndex += 1;
				}
				mockedGetChildHandler(id);
				return HttpResponse.json({ data: { getNode: result } });
			})
		);
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
			}
		} satisfies Partial<Resolvers>;

		const dataTransferObj = createUploadDataTransfer(uploadedFiles);

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		await screen.findByText(destinationFile.name);

		fireEvent.dragEnter(screen.getByText(destinationFile.name), {
			dataTransfer: dataTransferObj
		});

		await screen.findByTestId(SELECTORS.dropzone);
		expect(
			screen.queryByText(/Drop here your attachments to quick-add them to this folder/m)
		).toBeVisible();

		fireEvent.drop(screen.getByText(destinationFile.name), {
			dataTransfer: dataTransferObj
		});

		await act(async () => {
			await jest.advanceTimersToNextTimerAsync();
		});
		await waitFor(() => expect(mockedGetChildHandler).toHaveBeenCalledTimes(uploadedFiles.length));
		await screen.findByText(uploadedFiles[0].name);
		await screen.findByText(uploadedFiles[1].name);
		expect(screen.getByText(uploadedFiles[0].name)).toBeVisible();
		expect(screen.getByText(uploadedFiles[1].name)).toBeVisible();
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFolder.children.nodes.length + uploadedFiles.length
		);
		expect(
			screen.queryByText(/Drop here your attachments to quick-add them to this folder/m)
		).not.toBeInTheDocument();
	});

	test('Drag of a node shows move dropzone in other nodes. Dragged node is disabled. Drop triggers move only on folders with right permissions.	Dragged node is removed from current folder list', async () => {
		const currentFolder = populateFolder(5);
		currentFolder.permissions.can_write_file = true;
		currentFolder.permissions.can_write_folder = true;
		const nodesToDrag = [currentFolder.children.nodes[0]] as Node[];
		forEach(nodesToDrag, (mockedNode) => {
			mockedNode.permissions.can_write_file = true;
			mockedNode.permissions.can_write_folder = true;
		});
		const destinationFolder = populateFolder();
		destinationFolder.permissions.can_write_folder = true;
		destinationFolder.permissions.can_write_file = true;
		destinationFolder.parent = currentFolder;
		currentFolder.children.nodes.push(destinationFolder);
		const folderWithoutPermission = populateFolder();
		folderWithoutPermission.permissions.can_write_folder = false;
		folderWithoutPermission.permissions.can_write_file = false;
		folderWithoutPermission.parent = currentFolder;
		currentFolder.children.nodes.push(folderWithoutPermission);

		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
			},
			Mutation: {
				moveNodes: mockMoveNodes(
					map(nodesToDrag, (node) => ({ ...node, parent: destinationFolder }))
				)
			}
		} satisfies Partial<Resolvers>;

		const dataTransfer = createMoveDataTransfer();

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		const itemToDrag = await screen.findByText(nodesToDrag[0].name);
		fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
		fireEvent.dragEnter(itemToDrag, { dataTransfer: dataTransfer() });
		await screen.findByTestId(SELECTORS.dropzone);
		// two items are visible for the node, the one in the list is disabled, the other one is the one dragged and is not disabled
		const draggedNodeItems = screen.getAllByText(nodesToDrag[0].name);
		expect(draggedNodeItems).toHaveLength(2);
		expect(draggedNodeItems[0]).toHaveStyle({ color: COLORS.text.disabled });
		expect(draggedNodeItems[1]).toHaveStyle({ color: COLORS.text.regular });
		// dropzone of the folder is shown
		expect(screen.getByTestId(SELECTORS.dropzone)).toBeVisible();
		expect(screen.getByText(/drag&drop mode/i)).toBeVisible();
		expect(
			screen.getByText(/drop here your items to quickly move them to this folder/i)
		).toBeVisible();
		fireEvent.dragLeave(itemToDrag, { dataTransfer: dataTransfer() });

		// drag and drop on folder without permissions
		const folderWithoutPermissionsItem = screen.getByText(folderWithoutPermission.name);
		fireEvent.dragEnter(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
		await screen.findByTestId(SELECTORS.dropzone);
		expect(screen.getByTestId(SELECTORS.dropzone)).toBeVisible();
		expect(screen.queryByText(/Drag&Drop Mode/i)).not.toBeInTheDocument();
		fireEvent.drop(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
		fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
		jest.advanceTimersByTime(TIMERS.HIDE_DROPZONE);
		expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
		expect(itemToDrag).toBeVisible();
		expect(itemToDrag).toHaveStyle({ color: COLORS.text.regular });

		// drag and drop on folder with permissions
		const destinationItem = screen.getByText(destinationFolder.name);
		fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
		fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
		await screen.findByTestId(SELECTORS.dropzone);
		expect(screen.getByTestId(SELECTORS.dropzone)).toBeVisible();
		expect(screen.queryByText('Drag&Drop Mode')).not.toBeInTheDocument();
		fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
		fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
		expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
		await waitForElementToBeRemoved(itemToDrag);
		expect(screen.queryByText(nodesToDrag[0].name)).not.toBeInTheDocument();
		await screen.findByText(/Item moved/i);
	});

	test('Drag of a node without move permissions cause no dropzone to be shown', async () => {
		const currentFolder = populateFolder(5);
		currentFolder.permissions.can_write_file = true;
		currentFolder.permissions.can_write_folder = true;
		const nodesToDrag = [currentFolder.children.nodes[0]] as Node[];
		forEach(nodesToDrag, (mockedNode) => {
			mockedNode.permissions.can_write_file = false;
			mockedNode.permissions.can_write_folder = false;
		});
		const destinationFolder = populateFolder();
		destinationFolder.permissions.can_write_folder = true;
		destinationFolder.permissions.can_write_file = true;
		destinationFolder.parent = currentFolder;
		currentFolder.children.nodes.push(destinationFolder);
		const folderWithoutPermission = populateFolder();
		folderWithoutPermission.permissions.can_write_folder = false;
		folderWithoutPermission.permissions.can_write_file = false;
		folderWithoutPermission.parent = currentFolder;
		currentFolder.children.nodes.push(folderWithoutPermission);

		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
			}
		} satisfies Partial<Resolvers>;

		const dataTransfer = createMoveDataTransfer();

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		const itemToDrag = await screen.findByText(nodesToDrag[0].name);
		fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
		fireEvent.dragEnter(itemToDrag, { dataTransfer: dataTransfer() });
		jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
		// two items are visible for the node, the one in the list is disabled, the other one is the one dragged and is not disabled
		const draggedNodeItems = screen.getAllByText(nodesToDrag[0].name);
		expect(draggedNodeItems).toHaveLength(2);
		expect(draggedNodeItems[0]).toHaveStyle({ color: COLORS.text.disabled });
		expect(draggedNodeItems[1]).toHaveStyle({ color: COLORS.text.regular });
		expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
		fireEvent.dragLeave(itemToDrag, { dataTransfer: dataTransfer() });

		// drag and drop on folder without permissions. Overlay is not shown.
		const folderWithoutPermissionsItem = screen.getByText(folderWithoutPermission.name);
		fireEvent.dragEnter(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
		jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
		expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
		fireEvent.drop(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
		fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
		expect(itemToDrag).toBeVisible();
		expect(itemToDrag).toHaveStyle({ color: COLORS.text.regular });

		// drag and drop on folder with permissions. Overlay is not shown.
		const destinationItem = screen.getByText(destinationFolder.name);
		fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
		fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
		jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
		expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
		fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
		fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
		expect(itemToDrag).toBeVisible();
		expect(itemToDrag).toHaveStyle({ color: COLORS.text.regular });
	});

	test('Drag of multiple nodes create a list of dragged nodes images', async () => {
		const currentFolder = populateFolder(5);
		currentFolder.permissions.can_write_file = true;
		currentFolder.permissions.can_write_folder = true;
		const nodesToDrag = [...currentFolder.children.nodes] as Node[];
		forEach(nodesToDrag, (mockedNode) => {
			mockedNode.permissions.can_write_file = true;
			mockedNode.permissions.can_write_folder = true;
		});
		const destinationFolder = populateFolder();
		destinationFolder.permissions.can_write_folder = true;
		destinationFolder.permissions.can_write_file = true;
		destinationFolder.parent = currentFolder;
		currentFolder.children.nodes.push(destinationFolder);

		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
			},
			Mutation: {
				moveNodes: mockMoveNodes(
					map(nodesToDrag, (node) => ({ ...node, parent: destinationFolder }))
				)
			}
		} satisfies Partial<Resolvers>;

		const dataTransfer = createMoveDataTransfer();

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
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
			expect(draggedImage[0]).toHaveStyle({ color: COLORS.text.disabled });
			expect(draggedImage[1]).toHaveStyle({ color: COLORS.text.regular });
		});

		const destinationItem = screen.getByText(destinationFolder.name);
		fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
		await screen.findByTestId(SELECTORS.dropzone);
		expect(screen.getByTestId(SELECTORS.dropzone)).toBeVisible();
		expect(screen.queryByText('Drag&Drop Mode')).not.toBeInTheDocument();
		fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
		fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
		expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
		await screen.findByText(/Item moved/i);
		forEach(nodesToDrag, (node) => {
			const draggedImage = screen.queryByText(node.name);
			expect(draggedImage).not.toBeInTheDocument();
		});

		expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
	});

	test('Drag of a node shows move dropzone in breadcrumbs. Drop triggers move only on crumbs with right permissions. Dragged node is removed from current folder list', async () => {
		const owner = populateUser();
		const currentFolder = populateFolder(5);
		currentFolder.permissions.can_write_file = true;
		currentFolder.permissions.can_write_folder = true;
		currentFolder.owner = owner;
		const { path } = populateParents(currentFolder, 4);
		path[0].permissions.can_write_folder = true;
		path[0].permissions.can_write_file = true;
		path[0].owner = owner;
		path[1].permissions.can_write_folder = false;
		path[1].permissions.can_write_file = false;
		path[1].owner = owner;

		const nodesToDrag = [currentFolder.children.nodes[0]] as Node[];
		forEach(nodesToDrag, (mockedNode) => {
			mockedNode.permissions.can_write_file = true;
			mockedNode.permissions.can_write_folder = true;
			mockedNode.owner = owner;
		});

		const mocks = {
			Query: {
				getPath: mockGetPath(path),
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
			},
			Mutation: {
				moveNodes: mockMoveNodes(map(nodesToDrag, (node) => ({ ...node, parent: path[0] })))
			}
		} satisfies Partial<Resolvers>;

		const dataTransfer = createMoveDataTransfer();

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		const itemToDrag = await screen.findByText(nodesToDrag[0].name);

		// load the full path
		await screen.findByText((currentFolder.parent as Folder).name);
		await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCtaExpand));
		await screen.findByText(path[0].name);

		// start to drag an item of the list
		fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });

		// drag and drop on crumb without permissions
		const folderWithoutPermissionsItem = screen.getByText(path[1].name);
		fireEvent.dragEnter(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
		fireEvent.dragOver(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
		const breadcrumbCrumbs = screen.getAllByTestId(SELECTORS.dropCrumb);
		const folderWithoutPermissionsCrumb = find(
			breadcrumbCrumbs,
			(crumb) => within(crumb).queryByText(path[1].name) !== null
		);
		expect(folderWithoutPermissionsCrumb).toHaveStyle({
			background: COLORS.dropzone.disabled
		});
		fireEvent.drop(folderWithoutPermissionsItem, { dataTransfer: dataTransfer() });
		fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
		expect(itemToDrag).toBeVisible();
		expect(itemToDrag).toHaveStyle({ color: COLORS.text.regular });

		expect(folderWithoutPermissionsCrumb).toHaveStyle({
			background: ''
		});

		// drag and drop on crumb with permissions
		const destinationItem = screen.getByText(path[0].name);
		const destinationCrumb = find(
			breadcrumbCrumbs,
			(crumb) => within(crumb).queryByText(path[0].name) !== null
		);
		fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
		fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
		fireEvent.dragOver(destinationItem, { dataTransfer: dataTransfer() });
		expect(destinationCrumb).toHaveStyle({
			background: COLORS.dropzone.enabled
		});
		fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
		fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
		expect(destinationCrumb).toHaveStyle({
			background: ''
		});
		await waitForElementToBeRemoved(itemToDrag);
		await screen.findByText(/Item moved/i);
		expect(screen.queryByText(nodesToDrag[0].name)).not.toBeInTheDocument();
	});

	test('Drag of a node, navigation inside a folder while dragging and drop in the new opened folder move the node in the opened folder. Dragged node is added to opened folder list', async () => {
		const currentFolder = populateFolder(0);
		currentFolder.permissions.can_write_file = true;
		currentFolder.permissions.can_write_folder = true;
		const draggedNode = populateNode();
		draggedNode.parent = currentFolder;
		const nodesToDrag = [draggedNode];
		forEach(nodesToDrag, (mockedNode) => {
			mockedNode.permissions.can_write_file = true;
			mockedNode.permissions.can_write_folder = true;
		});
		const destinationFolder = populateFolder(0);
		destinationFolder.permissions.can_write_folder = true;
		destinationFolder.permissions.can_write_file = true;
		destinationFolder.parent = currentFolder;
		currentFolder.children = populateNodePage([draggedNode, destinationFolder]);

		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder], [currentFolder, destinationFolder]),

				getNode: mockGetNode({
					getChildren: [
						currentFolder,
						destinationFolder,
						{
							...destinationFolder,
							children: populateNodePage(nodesToDrag)
						}
					],
					getPermissions: [currentFolder]
				})
			},
			Mutation: {
				moveNodes: mockMoveNodes(
					map(nodesToDrag, (node) => ({ ...node, parent: destinationFolder }))
				)
			}
		} satisfies Partial<Resolvers>;

		const dataTransfer = createMoveDataTransfer();

		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		const nodeToDrag = await screen.findByText(draggedNode.name);
		expect(nodeToDrag).toBeVisible();
		fireEvent.dragStart(nodeToDrag, { dataTransfer: dataTransfer() });
		fireEvent.dragEnter(screen.getByText(destinationFolder.name), { dataTransfer: dataTransfer() });
		act(() => {
			jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
		});
		// dropzone of the node item is shown
		expect(screen.getByTestId(SELECTORS.dropzone)).toBeVisible();
		expect(screen.queryByText(/drag&drop mode/i)).not.toBeInTheDocument();

		// wait for navigation timer to be executed
		act(() => {
			jest.advanceTimersByTime(TIMERS.DRAG_NAVIGATION_TRIGGER);
		});

		await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
		expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
		fireEvent.dragEnter(screen.getByText(/nothing here/i), { dataTransfer: dataTransfer() });
		act(() => {
			jest.advanceTimersByTime(TIMERS.SHOW_DROPZONE);
		});
		// dropzone of the folder list is shown
		expect(screen.getByTestId(SELECTORS.dropzone)).toBeVisible();
		expect(screen.getByText(/drag&drop mode/i)).toBeVisible();
		expect(
			screen.getByText(/drop here your items to quickly move them to this folder/i)
		).toBeVisible();
		fireEvent.drop(screen.getByText(/nothing here/i), { dataTransfer: dataTransfer() });
		await screen.findByText(/Item moved/i);

		await screen.findByText(draggedNode.name);
		expect(screen.getByText(draggedNode.name)).toBeVisible();
		expect(screen.queryByText(/nothing here/i)).not.toBeInTheDocument();
	});
});
