/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, fireEvent, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { forEach, map, find } from 'lodash';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import { TIMERS } from '../constants';
import { COLORS, ICON_REGEXP, SELECTORS } from '../constants/test';
import {
	populateFolder,
	populateNode,
	populateNodePage,
	populateParents,
	populateUser
} from '../mocks/mockUtils';
import { setup, createMoveDataTransfer } from '../tests/utils';
import { Node } from '../types/common';
import { Resolvers } from '../types/graphql/resolvers-types';
import { Folder } from '../types/graphql/types';
import { mockGetNode, mockGetPath, mockMoveNodes } from '../utils/resolverMocks';

jest.mock<typeof import('./components/Displayer')>('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): React.JSX.Element => (
		<div data-testid="displayer">
			{props.translationKey}:{props.icons}
		</div>
	)
}));

describe('Drag and drop', () => {
	test('Drop of a node in a valid folder remove node from current folder list', async () => {
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
		currentFolder.children.nodes.unshift(destinationFolder);

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
		const destinationItem = screen.getByText(destinationFolder.name);
		fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
		fireEvent.dragEnter(destinationItem, { dataTransfer: dataTransfer() });
		expect(await screen.findByTestId(SELECTORS.dropzone)).toBeVisible();
		expect(screen.queryByText('Drag&Drop Mode')).not.toBeInTheDocument();
		fireEvent.drop(destinationItem, { dataTransfer: dataTransfer() });
		fireEvent.dragEnd(itemToDrag, { dataTransfer: dataTransfer() });
		expect(screen.queryByTestId(SELECTORS.dropzone)).not.toBeInTheDocument();
		await waitForElementToBeRemoved(itemToDrag);
		await screen.findByText(/Item moved/i);
		expect(screen.queryByText(nodesToDrag[0].name)).not.toBeInTheDocument();
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
