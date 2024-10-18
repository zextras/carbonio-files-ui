/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { List } from './List';
import { ACTION_REGEXP, COLORS, ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateFile, populateFolder, populateNode } from '../../mocks/mockUtils';
import { setup, selectNodes, screen } from '../../tests/utils';
import { File, Folder } from '../../types/graphql/types';

jest.mock<typeof import('./VirtualizedNodeListItem')>('./VirtualizedNodeListItem');

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
			currentFolder.children.nodes.push(folder, node, file);

			const { user } = setup(
				<List
					nodes={currentFolder.children.nodes as (File | Folder)[]}
					mainList
					emptyListMessage={'hint'}
				/>
			);

			await screen.findByText(file.name);
			// select file without can_write_file permission
			await selectNodes([file.id], user);
			// check that all wanted items are selected
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));

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
			expect(screen.getByTestId(ICON_REGEXP.moreVertical)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
			moveAction = await screen.findByText(ACTION_REGEXP.move);
			expect(moveAction).toBeVisible();
			expect(moveAction).toHaveStyle({
				color: COLORS.text.regular
			});
		});

		test('Move is enabled when multiple files are selected', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;
			const file = populateFile();
			file.permissions.can_write_file = true;
			file.parent = currentFolder;
			file.flagged = true;
			const folder = populateFolder();
			folder.permissions.can_write_folder = true;
			folder.parent = currentFolder;
			folder.flagged = true;
			currentFolder.children.nodes.push(folder, file);

			const { user } = setup(
				<List
					nodes={currentFolder.children.nodes as (File | Folder)[]}
					mainList
					emptyListMessage={'hint'}
					folderId={currentFolder.id}
				/>
			);

			await screen.findByText(file.name);
			await screen.findByTestId(SELECTORS.customBreadcrumbs);
			await selectNodes([file.id, folder.id], user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);
			await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));
			const moveIcon = await screen.findByRoleWithIcon('button', { icon: ICON_REGEXP.move });
			expect(moveIcon).toBeEnabled();
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
			currentFolder.children.nodes.push(folder, node, file);

			const { user } = setup(
				<List
					nodes={currentFolder.children.nodes as (File | Folder)[]}
					mainList
					emptyListMessage={'hint'}
				/>
			);

			// right click to open contextual menu on file without permission
			const fileItem = await screen.findByText(file.name);
			await user.rightClick(fileItem);
			await screen.findByText(ACTION_REGEXP.copy);
			expect(screen.queryByText(ACTION_REGEXP.move)).not.toBeInTheDocument();
			// right click to open contextual menu on folder without permission
			const folderItem = await screen.findByText(folder.name);
			await user.rightClick(folderItem);
			await screen.findByText(ACTION_REGEXP.copy);
			expect(screen.queryByText(ACTION_REGEXP.move)).not.toBeInTheDocument();
			// right click to open contextual menu on node with permission
			const nodeItem = await screen.findByText(node.name);
			await user.rightClick(nodeItem);
			expect(await screen.findByText(ACTION_REGEXP.move)).toBeInTheDocument();
		});
	});
});
