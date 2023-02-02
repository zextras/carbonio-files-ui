/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { fireEvent, screen, within } from '@testing-library/react';
import { map } from 'lodash';

import { ACTION_REGEXP } from '../../constants/test';
import { populateFile, populateFolder, populateNode } from '../../mocks/mockUtils';
import { Node } from '../../types/common';
import { setup, selectNodes } from '../../utils/testUtils';
import { List } from './List';

describe('Mark for deletion - trash', () => {
	describe('Selection mode', () => {
		test('Mark for deletion is visible and not disabled when more than one file is selected', async () => {
			// remember that all nodes inside folder are not trashed
			const currentFolder = populateFolder(0);
			// enable permission to rename
			for (let i = 0; i < 2; i += 1) {
				const node = populateNode();
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
				node.flagged = false;
				currentFolder.children.nodes.push(node);
			}

			const { user } = setup(
				<List
					nodes={currentFolder.children.nodes as Array<Node>}
					mainList
					emptyListMessage={'hint'}
				/>
			);

			// activate selection mode by selecting items
			await selectNodes(
				map(currentFolder.children.nodes, (node) => (node as Node).id),
				user
			);
			// check that all wanted items are selected
			expect(screen.getAllByTestId('checkedAvatar')).toHaveLength(
				currentFolder.children.nodes.length
			);

			const selectionModeActiveListHeader = screen.getByTestId('list-header-selectionModeActive');

			const trashIcon = within(selectionModeActiveListHeader).getByTestId('icon: Trash2Outline');

			expect(trashIcon).toBeVisible();
			expect(trashIcon.parentElement).not.toHaveAttribute('disable');

			await selectNodes(
				map(currentFolder.children.nodes, (node) => (node as Node).id),
				user
			);

			expect(screen.queryByTestId('checkedAvatar')).not.toBeInTheDocument();
			expect.assertions(4);
		});

		test('Mark for deletion is visible but disabled in selection when one file do not have permission', async () => {
			const currentFolder = populateFolder(0);
			const fileId1 = 'test-fileId1';
			const filename1 = 'test-fileName1';
			const file = populateFile(fileId1, filename1);
			file.permissions.can_write_file = false;
			currentFolder.children.nodes.push(file);

			const folder = populateFolder();
			folder.permissions.can_write_folder = true;
			currentFolder.children.nodes.push(folder);

			const { user } = setup(
				<List
					nodes={currentFolder.children.nodes as Array<Node>}
					mainList
					emptyListMessage={'hint'}
				/>
			);

			await screen.findByText(filename1);

			// activate selection mode by selecting items
			await selectNodes(
				map(currentFolder.children.nodes, (node) => (node as Node).id),
				user
			);
			// check that all wanted items are selected
			expect(screen.getAllByTestId('checkedAvatar')).toHaveLength(
				currentFolder.children.nodes.length
			);

			const selectionModeActiveListHeader = screen.getByTestId('list-header-selectionModeActive');

			const trashIcon = within(selectionModeActiveListHeader).queryByTestId('icon: Trash2Outline');

			expect(trashIcon).not.toBeInTheDocument();

			await selectNodes(
				map(currentFolder.children.nodes, (node) => (node as Node).id),
				user
			);

			expect(screen.queryByTestId('checkedAvatar')).not.toBeInTheDocument();
			expect.assertions(3);
		});
	});

	describe('Contextual menu actions', () => {
		test('Mark for deletion is hidden if node does not have permissions', async () => {
			const currentFolder = populateFolder();
			const node = populateNode();
			node.permissions.can_write_file = false;
			node.permissions.can_write_folder = false;
			currentFolder.children.nodes.push(node);

			setup(
				<List
					nodes={currentFolder.children.nodes as Array<Node>}
					mainList
					emptyListMessage={'hint'}
				/>
			);

			// right click to open contextual menu
			const nodeItem = screen.getByTestId(`node-item-${node.id}`);
			fireEvent.contextMenu(nodeItem);
			await screen.findByText(ACTION_REGEXP.copy);
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
			expect.assertions(1);
		});
	});
});
