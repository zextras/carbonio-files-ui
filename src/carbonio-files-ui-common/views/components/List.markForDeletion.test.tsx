/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { map } from 'lodash';

import { List } from './List';
import { SelectionProvider } from './SelectionProvider';
import { ACTION_REGEXP, COLORS, ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateFile, populateFolder, populateNode } from '../../mocks/mockUtils';
import { setup, selectNodes, screen, within } from '../../tests/utils';
import { File, Folder } from '../../types/graphql/types';

vi.mock('./VirtualizedNodeListItem');

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
				<SelectionProvider items={currentFolder.children.nodes as (File | Folder)[]}>
					<List
						nodes={currentFolder.children.nodes as (File | Folder)[]}
						mainList
						emptyListMessage={'hint'}
					/>
				</SelectionProvider>
			);

			// activate selection mode by selecting items
			await selectNodes(
				map(currentFolder.children.nodes, (node) => node?.id || ''),
				user
			);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(
				currentFolder.children.nodes.length
			);

			await user.click(screen.getByTestId(ICON_REGEXP.moreVertical));

			const trashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(trashAction).toBeVisible();
			expect(trashAction).toHaveStyle({
				color: COLORS.text.regular
			});

			await selectNodes(
				map(currentFolder.children.nodes, (node) => node?.id || ''),
				user
			);
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
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
				<SelectionProvider items={currentFolder.children.nodes as (File | Folder)[]}>
					<List
						nodes={currentFolder.children.nodes as (File | Folder)[]}
						mainList
						emptyListMessage={'hint'}
					/>
				</SelectionProvider>
			);

			await screen.findByText(filename1);

			// activate selection mode by selecting items
			await selectNodes(
				map(currentFolder.children.nodes, (node) => node?.id || ''),
				user
			);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(
				currentFolder.children.nodes.length
			);

			const selectionModeActiveListHeader = screen.getByTestId(SELECTORS.listHeaderSelectionMode);

			const trashIcon = within(selectionModeActiveListHeader).queryByRoleWithIcon('button', {
				icon: ICON_REGEXP.moveToTrash
			});

			expect(trashIcon).not.toBeInTheDocument();

			await selectNodes(
				map(currentFolder.children.nodes, (node) => node?.id || ''),
				user
			);
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
		});
	});

	describe('Contextual menu actions', () => {
		test('Mark for deletion is hidden if node does not have permissions', async () => {
			const currentFolder = populateFolder();
			const node = populateNode();
			node.permissions.can_write_file = false;
			node.permissions.can_write_folder = false;
			currentFolder.children.nodes.push(node);

			const { user } = setup(
				<SelectionProvider items={currentFolder.children.nodes as (File | Folder)[]}>
					<List
						nodes={currentFolder.children.nodes as (File | Folder)[]}
						mainList
						emptyListMessage={'hint'}
					/>
				</SelectionProvider>
			);

			// right click to open contextual menu
			const nodeItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
			await user.rightClick(nodeItem);
			await screen.findByText(ACTION_REGEXP.copy);
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
		});
	});
});
