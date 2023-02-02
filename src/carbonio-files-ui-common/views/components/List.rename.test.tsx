/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { ApolloError } from '@apollo/client';
import { fireEvent, screen, within } from '@testing-library/react';
import { forEach, map } from 'lodash';

import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateFolder, populateNode, sortNodes } from '../../mocks/mockUtils';
import { Node } from '../../types/common';
import { NodeSort } from '../../types/graphql/types';
import { mockUpdateNodeError } from '../../utils/mockUtils';
import { generateError, renameNode, setup, selectNodes } from '../../utils/testUtils';
import { List } from './List';

describe('Rename', () => {
	describe('Selection mode', () => {
		test('Rename is hidden when multiple files are selected', async () => {
			const children: Array<Node> = [];
			// enable permission to rename
			for (let i = 0; i < 2; i += 1) {
				const node = populateNode();
				node.permissions.can_write_file = true;
				node.permissions.can_write_folder = true;
				children.push(node);
			}

			const { user } = setup(<List nodes={children} mainList emptyListMessage={'hint'} />);

			// activate selection mode by selecting items
			await selectNodes(
				map(children, (node) => (node as Node).id),
				user
			);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(children.length);

			// check that the rename action becomes visible but disabled
			expect(screen.queryByTestId(ICON_REGEXP.rename)).not.toBeInTheDocument();
			const moreIconButton = screen.queryByTestId(ICON_REGEXP.moreVertical);
			if (moreIconButton) {
				expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
			}
		});

		test('Rename is hidden if node does not have permissions', async () => {
			const children: Array<Node> = [];
			// disable permission to rename
			const node = populateNode();
			node.permissions.can_write_file = false;
			node.permissions.can_write_folder = false;
			children.push(node);

			const { user } = setup(<List nodes={children} mainList emptyListMessage={'hint'} />);

			// activate selection mode by selecting items
			await selectNodes([node.id], user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(children.length);

			// check that the rename action becomes visible but disabled
			expect(screen.queryByTestId(ICON_REGEXP.rename)).not.toBeInTheDocument();
			const moreIconButton = screen.queryByTestId(ICON_REGEXP.moreVertical);
			if (moreIconButton) {
				expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
			}
		});

		test('Rename operation fail shows an error in the modal and does not close it', async () => {
			const currentFolder = populateFolder(2);
			// enable permission to rename
			forEach(currentFolder.children.nodes, (mockedNode) => {
				(mockedNode as Node).permissions.can_write_file = true;
				(mockedNode as Node).permissions.can_write_folder = true;
			});
			const sort = NodeSort.NameAsc; // sort only by name
			sortNodes(currentFolder.children.nodes, sort);

			// rename first element with name of the second one
			const element = currentFolder.children.nodes[0] as Node;
			const newName = (currentFolder.children.nodes[1] as Node).name;

			const mocks = [
				mockUpdateNodeError(
					{
						node_id: element.id,
						name: newName
					},
					new ApolloError({ graphQLErrors: [generateError('Error! Name already assigned')] })
				)
			];

			const { user } = setup(
				<List
					nodes={currentFolder.children.nodes as Array<Node>}
					mainList
					emptyListMessage={'hint'}
				/>,
				{ mocks }
			);

			// activate selection mode by selecting items
			await selectNodes([element.id], user);
			// check that all wanted items are selected
			expect(screen.getByTestId('checkedAvatar')).toBeInTheDocument();
			expect(screen.getByTestId('icon: MoreVertical')).toBeVisible();
			await user.click(screen.getByTestId('icon: MoreVertical'));
			// check that the rename action becomes visible
			await renameNode(newName, user);
			const error = await within(screen.getByTestId('modal')).findByText(
				/Error! Name already assigned/i
			);
			const inputFieldDiv = screen.getByTestId('input-name');
			const inputField = within(inputFieldDiv).getByRole('textbox');
			expect(error).toBeVisible();
			expect(inputField).toBeVisible();
			expect(inputField).toHaveValue(newName);
		});
	});

	describe('Contextual menu actions', () => {
		test('Rename is hidden if node does not have permissions', async () => {
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
			await screen.findByText(ACTION_REGEXP.manageShares);
			expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
		});

		test('Rename is hidden if select more than 1 node in selection mode', async () => {
			const currentFolder = populateFolder(5);
			// enable permission to Mfd
			forEach(currentFolder.children.nodes, (mockedNode) => {
				(mockedNode as Node).permissions.can_write_file = true;
				(mockedNode as Node).permissions.can_write_folder = true;
				(mockedNode as Node).parent = populateFolder(0, currentFolder.id, currentFolder.name);
			});
			const element0 = currentFolder.children.nodes[0] as Node;
			const element1 = currentFolder.children.nodes[1] as Node;

			const { user } = setup(
				<List
					nodes={currentFolder.children.nodes as Array<Node>}
					mainList
					emptyListMessage={'hint'}
				/>
			);

			await selectNodes([element0.id, element1.id], user);

			// right click to open contextual menu
			const nodeItem = screen.getByTestId(`node-item-${element0.id}`);
			fireEvent.contextMenu(nodeItem);
			await screen.findByText(ACTION_REGEXP.copy);
			let renameAction = screen.queryByText(ACTION_REGEXP.rename);
			expect(renameAction).not.toBeInTheDocument();
			await selectNodes([element1.id], user);
			fireEvent.contextMenu(nodeItem);
			renameAction = await screen.findByText(ACTION_REGEXP.rename);
			expect(renameAction).toBeVisible();
			expect(renameAction).not.toHaveAttribute('disabled', '');
		});
	});
});
