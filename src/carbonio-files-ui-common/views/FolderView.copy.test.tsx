/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { map } from 'lodash';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../constants/test';
import GET_CHILDREN from '../graphql/queries/getChildren.graphql';
import { populateFile, populateFolder } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { Folder, GetChildrenQuery, GetChildrenQueryVariables } from '../types/graphql/types';
import {
	getChildrenVariables,
	mockCopyNodes,
	mockGetChild,
	mockGetChildren,
	mockGetPath,
	mockGetPermissions
} from '../utils/mockUtils';
import { setup, selectNodes } from '../utils/testUtils';
import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest.fn(),
		removeCreateOptions: jest.fn()
	})
}));

jest.mock('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): JSX.Element => (
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

			const mocks = [
				mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
				mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
				mockGetChild({ node_id: currentFolder.id }, currentFolder)
			];

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(file.name);
			await selectNodes([file.id, folder.id], user);

			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);
			const copyAction = await screen.findByTestId(ICON_REGEXP.copy);
			expect(copyAction).toBeVisible();
			expect(copyAction).not.toHaveAttribute('disabled', '');
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
				query: GET_CHILDREN,
				variables: getChildrenVariables(destinationFolder.id),
				data: {
					getNode: destinationFolder
				}
			});
			const mocks = [
				mockGetPath({ node_id: currentFolder.id }, [currentFolder]),
				mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
				mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
				mockGetChild({ node_id: currentFolder.id }, currentFolder),
				mockCopyNodes(
					{
						node_ids: [nodeToCopy.id],
						destination_id: destinationFolder.id
					},
					[{ ...nodeToCopy, parent: destinationFolder }]
				)
			];

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(nodeToCopy.name);

			let destinationFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GET_CHILDREN,
				variables: getChildrenVariables(destinationFolder.id)
			});

			expect(destinationFolderCachedData?.getNode || null).not.toBeNull();
			expect((destinationFolderCachedData?.getNode as Folder).id).toBe(destinationFolder.id);

			// activate selection mode by selecting items
			await selectNodes([nodeToCopy.id], user);
			// check that all wanted items are selected
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			let copyAction = screen.queryByTestId(ICON_REGEXP.copy);
			if (!copyAction) {
				expect(screen.getByTestId('icon: MoreVertical')).toBeVisible();
				await user.click(screen.getByTestId('icon: MoreVertical'));
				copyAction = await screen.findByText(ACTION_REGEXP.copy);
				expect(copyAction).toBeVisible();
			}
			await user.click(copyAction);

			const modalList = await screen.findByTestId(`modal-list-${currentFolder.id}`);
			const destinationFolderItem = await within(modalList).findByText(destinationFolder.name);
			await user.click(destinationFolderItem);
			act(() => {
				// run timers of modal
				jest.advanceTimersToNextTimer();
			});
			expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).not.toHaveAttribute(
				'disabled',
				''
			);
			await user.click(screen.getByRole('button', { name: ACTION_REGEXP.copy }));
			await screen.findByText(/Item copied/i);
			expect(screen.queryByRole('button', { name: ACTION_REGEXP.copy })).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

			destinationFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GET_CHILDREN,
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
				id: faker.datatype.uuid(),
				name: `${node.name}-copied`
			}));

			const mocks = [
				mockGetPath({ node_id: currentFolder.id }, [currentFolder]),
				mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
				mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
				mockGetChild({ node_id: currentFolder.id }, currentFolder),
				mockCopyNodes(
					{
						node_ids: map(nodesToCopy, (node) => node.id),
						destination_id: currentFolder.id
					},
					copiedNodes
				)
			];

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(nodesToCopy[0].name);

			expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(
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
				expect(screen.getByTestId('icon: MoreVertical')).toBeVisible();
				await user.click(screen.getByTestId('icon: MoreVertical'));
				copyAction = await screen.findByText(ACTION_REGEXP.copy);
				expect(copyAction).toBeVisible();
			}
			await user.click(copyAction);

			const modalList = await screen.findByTestId(`modal-list-${currentFolder.id}`);
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			expect(within(modalList).getAllByTestId('node-item', { exact: false })).toHaveLength(
				currentFolder.children.nodes.length
			);
			expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).not.toHaveAttribute(
				'disabled',
				''
			);
			await user.click(screen.getByRole('button', { name: ACTION_REGEXP.copy }));
			await screen.findByText(/Item copied/i);
			expect(screen.queryByRole('button', { name: ACTION_REGEXP.copy })).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

			const nodeItems = screen.getAllByTestId('node-item', { exact: false });
			expect(screen.getByText(copiedNodes[0].name)).toBeVisible();
			expect(screen.getByText(copiedNodes[1].name)).toBeVisible();
			expect(nodeItems).toHaveLength(currentFolder.children.nodes.length + copiedNodes.length);
			// each node is positioned after its original
			expect(screen.getByTestId(`node-item-${copiedNodes[0].id}`)).toBe(nodeItems[1]);
			expect(screen.getByTestId(`node-item-${copiedNodes[1].id}`)).toBe(nodeItems[3]);
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
				query: GET_CHILDREN,
				variables: getChildrenVariables(destinationFolder.id),
				data: {
					getNode: destinationFolder
				}
			});

			const mocks = [
				mockGetPath({ node_id: currentFolder.id }, [currentFolder]),
				mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
				mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
				mockGetChild({ node_id: currentFolder.id }, currentFolder),
				mockCopyNodes(
					{
						node_ids: [nodeToCopy.id],
						destination_id: destinationFolder.id
					},
					[{ ...nodeToCopy, parent: destinationFolder }]
				)
			];

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await screen.findByText(nodeToCopy.name);

			let destinationFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GET_CHILDREN,
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

			const modalList = await screen.findByTestId(`modal-list-${currentFolder.id}`);
			const destinationFolderItem = await within(modalList).findByText(destinationFolder.name);
			await user.click(destinationFolderItem);
			act(() => {
				// run timers of modal
				jest.advanceTimersToNextTimer();
			});
			expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).not.toHaveAttribute(
				'disabled',
				''
			);
			await user.click(screen.getByRole('button', { name: ACTION_REGEXP.copy }));
			await screen.findByText(/Item copied/i);
			expect(screen.queryByRole('button', { name: ACTION_REGEXP.copy })).not.toBeInTheDocument();
			// context menu is closed
			expect(screen.queryByText(ACTION_REGEXP.copy)).not.toBeInTheDocument();

			destinationFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GET_CHILDREN,
				variables: getChildrenVariables(destinationFolder.id)
			});

			expect(destinationFolderCachedData).toBeNull();
		});
	});
});
