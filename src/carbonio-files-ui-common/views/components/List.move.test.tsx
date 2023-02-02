/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { fireEvent, screen } from '@testing-library/react';

import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateFile, populateFolder, populateNode } from '../../mocks/mockUtils';
import { Node } from '../../types/common';
import { setup, selectNodes } from '../../utils/testUtils';
import { List } from './List';

describe('Move', () => {
	describe('Selection mode', () => {
		test('Move is hidden if node has not permissions', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			const file = populateFile();
			file.permissions.can_write_file = false;
			file.parent = currentFolder;
			const folder = populateFolder();
			folder.permissions.can_write_folder = false;
			folder.parent = currentFolder;
			const node = populateNode();
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.parent = currentFolder;
			currentFolder.children.nodes.push(file, folder, node);

			const { user } = setup(
				<List
					nodes={currentFolder.children.nodes as Array<Node>}
					mainList
					emptyListMessage={'hint'}
				/>
			);

			await screen.findByText(file.name);
			// select file without can_write_file permission
			await selectNodes([file.id], user);
			// check that all wanted items are selected
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			expect(screen.getByTestId('icon: MoreVertical')).toBeVisible();
			await user.click(screen.getByTestId('icon: MoreVertical'));

			// wait copy to be sure that popper is open
			await screen.findByText(ACTION_REGEXP.copy);
			let moveAction = screen.queryByText(ACTION_REGEXP.move);
			expect(moveAction).not.toBeInTheDocument();
			// deselect file and select folder without can_write_folder permission
			await selectNodes([file.id, folder.id], user);
			// check that all wanted items are selected
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.move)).not.toBeInTheDocument();
			// deselect folder and select node with right permission
			await selectNodes([folder.id, node.id], user);
			// check that all wanted items are selected
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			expect(screen.getByTestId('icon: MoreVertical')).toBeVisible();
			await user.click(screen.getByTestId('icon: MoreVertical'));
			moveAction = await screen.findByText(ACTION_REGEXP.move);
			expect(moveAction).toBeVisible();
			expect(moveAction).not.toHaveAttribute('disabled', '');
		});

		test('Move is enabled when multiple files are selected', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			const file = populateFile();
			file.permissions.can_write_file = true;
			file.parent = currentFolder;
			const folder = populateFolder();
			folder.permissions.can_write_folder = true;
			folder.parent = currentFolder;
			currentFolder.children.nodes.push(file, folder);

			const { user } = setup(
				<List
					nodes={currentFolder.children.nodes as Array<Node>}
					mainList
					emptyListMessage={'hint'}
					folderId={currentFolder.id}
				/>
			);

			await screen.findByText(file.name);
			await selectNodes([file.id, folder.id], user);

			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);
			expect(screen.getByTestId('icon: MoreVertical')).toBeVisible();
			await user.click(screen.getByTestId('icon: MoreVertical'));
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);

			const moveIcon = await screen.findByTestId(ICON_REGEXP.move);
			expect(moveIcon).toBeVisible();
			expect(moveIcon.parentElement).not.toHaveAttribute('disabled', '');
		});
	});

	describe('Contextual menu actions', () => {
		test('Move is hidden if node has not permissions', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			const file = populateFile();
			file.permissions.can_write_file = false;
			file.parent = currentFolder;
			const folder = populateFolder();
			folder.permissions.can_write_folder = false;
			folder.parent = currentFolder;
			const node = populateNode();
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.parent = currentFolder;
			currentFolder.children.nodes.push(file, folder, node);

			setup(
				<List
					nodes={currentFolder.children.nodes as Array<Node>}
					mainList
					emptyListMessage={'hint'}
				/>
			);

			// right click to open contextual menu on file without permission
			const fileItem = await screen.findByText(file.name);
			fireEvent.contextMenu(fileItem);
			await screen.findByText(ACTION_REGEXP.copy);
			expect(screen.queryByText(ACTION_REGEXP.move)).not.toBeInTheDocument();
			// right click to open contextual menu on folder without permission
			const folderItem = await screen.findByText(folder.name);
			fireEvent.contextMenu(folderItem);
			await screen.findByText(ACTION_REGEXP.copy);
			expect(screen.queryByText(ACTION_REGEXP.move)).not.toBeInTheDocument();
			// right click to open contextual menu on node with permission
			const nodeItem = await screen.findByText(node.name);
			fireEvent.contextMenu(nodeItem);
			expect(await screen.findByText(ACTION_REGEXP.move)).toBeInTheDocument();
		});
	});
});
