/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act, fireEvent, screen } from '@testing-library/react';
import { forEach } from 'lodash';

import { ACTION_REGEXP } from '../../constants/test';
import { populateFolder, populateNode } from '../../mocks/mockUtils';
import { Node } from '../../types/common';
import { mockGetChild } from '../../utils/mockUtils';
import { setup, selectNodes } from '../../utils/testUtils';
import { EmptySpaceFiller } from './EmptySpaceFiller';
import { List } from './List';

describe('Contextual menu actions', () => {
	describe('Contextual menu on empty space', () => {
		describe('Contextual menu on empty space in a folder with few nodes', () => {
			test('when isCanCreateFolder and isCanCreateFolder are true', async () => {
				const currentFolder = populateFolder();
				const node1 = populateNode();
				const node2 = populateNode();
				const node3 = populateNode();

				currentFolder.children.nodes.push(node1, node2, node3);

				const createFolderAction = jest.fn();
				const createDocumentAction = jest.fn();
				const createSpreadsheetAction = jest.fn();
				const createPresentationAction = jest.fn();
				const isCanCreateFolder = true;
				const isCanCreateFile = true;

				const actions = [
					{
						id: 'create-folder',
						label: 'New Folder',
						icon: 'FolderOutline',
						click: createFolderAction,
						disabled: !isCanCreateFolder
					},
					{
						id: 'create-docs-document',
						label: 'New Document',
						icon: 'FileTextOutline',
						click: createDocumentAction,
						disabled: !isCanCreateFile
					},
					{
						id: 'create-docs-spreadsheet',
						label: 'New Spreadsheet',
						icon: 'FileCalcOutline',
						click: createSpreadsheetAction,
						disabled: !isCanCreateFile
					},
					{
						id: 'create-docs-presentation',
						label: 'New Presentation',
						icon: 'FilePresentationOutline',
						click: createPresentationAction,
						disabled: !isCanCreateFile
					}
				];

				const mocks = [mockGetChild({ node_id: currentFolder.id, shares_limit: 1 }, currentFolder)];

				const { user } = setup(
					<List
						folderId={currentFolder.id}
						fillerWithActions={<EmptySpaceFiller actions={actions} />}
						nodes={currentFolder.children.nodes as Array<Node>}
						mainList
						emptyListMessage={'hint'}
					/>,
					{ mocks }
				);

				const fillerContainer = await screen.findByTestId(`fillerContainer`);

				// open context menu and click on empty space
				fireEvent.contextMenu(fillerContainer);

				// new Folder
				const newFolderActionItem = await screen.findByText(/\bNew Folder\b/i);
				expect(newFolderActionItem).toBeVisible();
				expect(newFolderActionItem).not.toHaveAttribute('disabled', '');
				await user.click(newFolderActionItem);
				expect(createFolderAction).toBeCalledTimes(1);

				// open context menu and click on empty space
				fireEvent.contextMenu(fillerContainer);

				// new Document
				const newDocumentActionItem = await screen.findByText(/\bNew Document\b/i);
				expect(newDocumentActionItem).toBeVisible();
				expect(newDocumentActionItem).not.toHaveAttribute('disabled', '');
				await user.click(newDocumentActionItem);
				expect(createDocumentAction).toBeCalledTimes(1);

				// open context menu and click on empty space
				fireEvent.contextMenu(fillerContainer);

				// New Spreadsheet
				const newSpreadsheetActionItem = await screen.findByText(/\bNew Spreadsheet\b/i);
				expect(newSpreadsheetActionItem).toBeVisible();
				expect(newSpreadsheetActionItem).not.toHaveAttribute('disabled', '');
				await user.click(newSpreadsheetActionItem);
				expect(createSpreadsheetAction).toBeCalledTimes(1);

				// open context menu and click on empty space
				fireEvent.contextMenu(fillerContainer);

				// New Presentation
				const newPresentationActionItem = await screen.findByText(/\bNew Presentation\b/i);
				expect(newPresentationActionItem).toBeVisible();
				expect(newPresentationActionItem).not.toHaveAttribute('disabled', '');
				await user.click(newPresentationActionItem);
				expect(createPresentationAction).toBeCalledTimes(1);
			});

			test('when isCanCreateFolder and isCanCreateFolder are false', async () => {
				const currentFolder = populateFolder();
				const node1 = populateNode();
				const node2 = populateNode();
				const node3 = populateNode();

				currentFolder.children.nodes.push(node1, node2, node3);

				const createFolderAction = jest.fn();
				const createDocumentAction = jest.fn();
				const createSpreadsheetAction = jest.fn();
				const createPresentationAction = jest.fn();
				const isCanCreateFolder = false;
				const isCanCreateFile = false;

				const actions = [
					{
						id: 'create-folder',
						label: 'New Folder',
						icon: 'FolderOutline',
						click: createFolderAction,
						disabled: !isCanCreateFolder
					},
					{
						id: 'create-docs-document',
						label: 'New Document',
						icon: 'FileTextOutline',
						click: createDocumentAction,
						disabled: !isCanCreateFile
					},
					{
						id: 'create-docs-spreadsheet',
						label: 'New Spreadsheet',
						icon: 'FileCalcOutline',
						click: createSpreadsheetAction,
						disabled: !isCanCreateFile
					},
					{
						id: 'create-docs-presentation',
						label: 'New Presentation',
						icon: 'FilePresentationOutline',
						click: createPresentationAction,
						disabled: !isCanCreateFile
					}
				];

				const mocks = [mockGetChild({ node_id: currentFolder.id, shares_limit: 1 }, currentFolder)];

				const { user } = setup(
					<List
						folderId={currentFolder.id}
						fillerWithActions={<EmptySpaceFiller actions={actions} />}
						nodes={currentFolder.children.nodes as Array<Node>}
						mainList
						emptyListMessage={'hint'}
					/>,
					{ mocks }
				);

				const fillerContainer = await screen.findByTestId(`fillerContainer`);

				// open context menu and click on empty space
				fireEvent.contextMenu(fillerContainer);

				// new Folder
				const newFolderActionItem = await screen.findByText(/\bNew Folder\b/i);
				expect(newFolderActionItem).toBeVisible();
				expect(newFolderActionItem).toHaveAttribute('disabled', '');
				await user.click(newFolderActionItem);
				expect(createFolderAction).not.toBeCalled();

				// open context menu and click on empty space
				fireEvent.contextMenu(fillerContainer);

				// new Document
				const newDocumentActionItem = await screen.findByText(/\bNew Document\b/i);
				expect(newDocumentActionItem).toBeVisible();
				expect(newDocumentActionItem).toHaveAttribute('disabled', '');
				await user.click(newDocumentActionItem);
				expect(createDocumentAction).not.toBeCalled();

				// open context menu and click on empty space
				fireEvent.contextMenu(fillerContainer);

				// New Spreadsheet
				const newSpreadsheetActionItem = await screen.findByText(/\bNew Spreadsheet\b/i);
				expect(newSpreadsheetActionItem).toBeVisible();
				expect(newSpreadsheetActionItem).toHaveAttribute('disabled', '');
				await user.click(newSpreadsheetActionItem);
				expect(createSpreadsheetAction).not.toBeCalled();

				// open context menu and click on empty space
				fireEvent.contextMenu(fillerContainer);

				// New Presentation
				const newPresentationActionItem = await screen.findByText(/\bNew Presentation\b/i);
				expect(newPresentationActionItem).toBeVisible();
				expect(newPresentationActionItem).toHaveAttribute('disabled', '');
				await user.click(newPresentationActionItem);
				expect(createPresentationAction).not.toBeCalled();
			});
		});

		describe('Contextual menu on empty space in a folder with no nodes', () => {
			test('when isCanCreateFolder and isCanCreateFolder are true', async () => {
				const currentFolder = populateFolder();

				const createFolderAction = jest.fn();
				const createDocumentAction = jest.fn();
				const createSpreadsheetAction = jest.fn();
				const createPresentationAction = jest.fn();
				const isCanCreateFolder = true;
				const isCanCreateFile = true;

				const actions = [
					{
						id: 'create-folder',
						label: 'New Folder',
						icon: 'FolderOutline',
						click: createFolderAction,
						disabled: !isCanCreateFolder
					},
					{
						id: 'create-docs-document',
						label: 'New Document',
						icon: 'FileTextOutline',
						click: createDocumentAction,
						disabled: !isCanCreateFile
					},
					{
						id: 'create-docs-spreadsheet',
						label: 'New Spreadsheet',
						icon: 'FileCalcOutline',
						click: createSpreadsheetAction,
						disabled: !isCanCreateFile
					},
					{
						id: 'create-docs-presentation',
						label: 'New Presentation',
						icon: 'FilePresentationOutline',
						click: createPresentationAction,
						disabled: !isCanCreateFile
					}
				];

				const mocks = [mockGetChild({ node_id: currentFolder.id, shares_limit: 1 }, currentFolder)];

				const { user } = setup(
					<List
						folderId={currentFolder.id}
						fillerWithActions={<EmptySpaceFiller actions={actions} />}
						nodes={currentFolder.children.nodes as Array<Node>}
						mainList
						emptyListMessage={'hint'}
					/>,
					{ mocks }
				);

				const emptySpaceFiller = await screen.findByTestId(`emptyFolder`);

				// open context menu and click on empty space
				fireEvent.contextMenu(emptySpaceFiller);

				// new Folder
				const newFolderActionItem = await screen.findByText(/\bNew Folder\b/i);
				expect(newFolderActionItem).toBeVisible();
				expect(newFolderActionItem).not.toHaveAttribute('disabled', '');
				await user.click(newFolderActionItem);
				expect(createFolderAction).toBeCalledTimes(1);

				// open context menu and click on empty space
				fireEvent.contextMenu(emptySpaceFiller);

				// new Document
				const newDocumentActionItem = await screen.findByText(/\bNew Document\b/i);
				expect(newDocumentActionItem).toBeVisible();
				expect(newDocumentActionItem).not.toHaveAttribute('disabled', '');
				await user.click(newDocumentActionItem);
				expect(createDocumentAction).toBeCalledTimes(1);

				// open context menu and click on empty space
				fireEvent.contextMenu(emptySpaceFiller);

				// New Spreadsheet
				const newSpreadsheetActionItem = await screen.findByText(/\bNew Spreadsheet\b/i);
				expect(newSpreadsheetActionItem).toBeVisible();
				expect(newSpreadsheetActionItem).not.toHaveAttribute('disabled', '');
				await user.click(newSpreadsheetActionItem);
				expect(createSpreadsheetAction).toBeCalledTimes(1);

				// open context menu and click on empty space
				fireEvent.contextMenu(emptySpaceFiller);

				// New Presentation
				const newPresentationActionItem = await screen.findByText(/\bNew Presentation\b/i);
				expect(newPresentationActionItem).toBeVisible();
				expect(newPresentationActionItem).not.toHaveAttribute('disabled', '');
				await user.click(newPresentationActionItem);
				expect(createPresentationAction).toBeCalledTimes(1);
			});

			test('when isCanCreateFolder and isCanCreateFolder are false', async () => {
				const currentFolder = populateFolder();

				const createFolderAction = jest.fn();
				const createDocumentAction = jest.fn();
				const createSpreadsheetAction = jest.fn();
				const createPresentationAction = jest.fn();
				const isCanCreateFolder = false;
				const isCanCreateFile = false;

				const actions = [
					{
						id: 'create-folder',
						label: 'New Folder',
						icon: 'FolderOutline',
						click: createFolderAction,
						disabled: !isCanCreateFolder
					},
					{
						id: 'create-docs-document',
						label: 'New Document',
						icon: 'FileTextOutline',
						click: createDocumentAction,
						disabled: !isCanCreateFile
					},
					{
						id: 'create-docs-spreadsheet',
						label: 'New Spreadsheet',
						icon: 'FileCalcOutline',
						click: createSpreadsheetAction,
						disabled: !isCanCreateFile
					},
					{
						id: 'create-docs-presentation',
						label: 'New Presentation',
						icon: 'FilePresentationOutline',
						click: createPresentationAction,
						disabled: !isCanCreateFile
					}
				];

				const mocks = [mockGetChild({ node_id: currentFolder.id, shares_limit: 1 }, currentFolder)];

				const { user } = setup(
					<List
						folderId={currentFolder.id}
						fillerWithActions={<EmptySpaceFiller actions={actions} />}
						nodes={currentFolder.children.nodes as Array<Node>}
						mainList
						emptyListMessage={'hint'}
					/>,
					{ mocks }
				);

				const emptySpaceFiller = await screen.findByTestId(`emptyFolder`);

				// open context menu and click on empty space
				fireEvent.contextMenu(emptySpaceFiller);

				// new Folder
				const newFolderActionItem = await screen.findByText(/\bNew Folder\b/i);
				expect(newFolderActionItem).toBeVisible();
				expect(newFolderActionItem).toHaveAttribute('disabled', '');
				await user.click(newFolderActionItem);
				expect(createFolderAction).not.toBeCalled();

				// open context menu and click on empty space
				fireEvent.contextMenu(emptySpaceFiller);

				// new Document
				const newDocumentActionItem = await screen.findByText(/\bNew Document\b/i);
				expect(newDocumentActionItem).toBeVisible();
				expect(newDocumentActionItem).toHaveAttribute('disabled', '');
				await user.click(newDocumentActionItem);
				expect(createDocumentAction).not.toBeCalled();

				// open context menu and click on empty space
				fireEvent.contextMenu(emptySpaceFiller);

				// New Spreadsheet
				const newSpreadsheetActionItem = await screen.findByText(/\bNew Spreadsheet\b/i);
				expect(newSpreadsheetActionItem).toBeVisible();
				expect(newSpreadsheetActionItem).toHaveAttribute('disabled', '');
				await user.click(newSpreadsheetActionItem);
				expect(createSpreadsheetAction).not.toBeCalled();

				// open context menu and click on empty space
				fireEvent.contextMenu(emptySpaceFiller);

				// New Presentation
				const newPresentationActionItem = await screen.findByText(/\bNew Presentation\b/i);
				expect(newPresentationActionItem).toBeVisible();
				expect(newPresentationActionItem).toHaveAttribute('disabled', '');
				await user.click(newPresentationActionItem);
				expect(createPresentationAction).not.toBeCalled();
			});
		});
	});

	describe('Contextual menu actions with selection active', () => {
		test('Contextual menu shown actions', async () => {
			const currentFolder = populateFolder(5);
			// enable permission to Mfd
			forEach(currentFolder.children.nodes, (mockedNode) => {
				(mockedNode as Node).permissions.can_write_file = true;
				(mockedNode as Node).permissions.can_write_folder = true;
				(mockedNode as Node).flagged = false;
				(mockedNode as Node).parent = populateFolder(0, currentFolder.id, currentFolder.name);
			});
			const element0 = currentFolder.children.nodes[0] as Node;
			const element1 = currentFolder.children.nodes[1] as Node;

			const mocks = [mockGetChild({ node_id: currentFolder.id, shares_limit: 1 }, currentFolder)];

			const { user } = setup(
				<List
					folderId={currentFolder.id}
					fillerWithActions={<EmptySpaceFiller actions={[]} />}
					nodes={currentFolder.children.nodes as Array<Node>}
					mainList
					emptyListMessage={'hint'}
				/>,
				{ mocks }
			);

			await selectNodes([element0.id, element1.id], user);

			// right click to open contextual menu
			const nodeItem = screen.getByTestId(`node-item-${element0.id}`);
			fireEvent.contextMenu(nodeItem);

			const moveToTrashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(moveToTrashAction).toBeVisible();

			expect(screen.queryByText(ACTION_REGEXP.openDocument)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.download)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.unflag)).not.toBeInTheDocument();

			const copyAction = await screen.findByText(ACTION_REGEXP.copy);
			expect(copyAction).toBeVisible();

			const flagAction = await screen.findByText(ACTION_REGEXP.flag);
			expect(flagAction).toBeVisible();
		});

		test('Contextual menu works only on selected nodes', async () => {
			const currentFolder = populateFolder(5);
			currentFolder.permissions.can_write_file = true;
			currentFolder.permissions.can_write_folder = true;

			forEach(currentFolder.children.nodes, (mockedNode) => {
				(mockedNode as Node).permissions.can_write_file = true;
				(mockedNode as Node).permissions.can_write_folder = true;
				(mockedNode as Node).parent = currentFolder;
				(mockedNode as Node).owner = currentFolder.owner;
				(mockedNode as Node).flagged = false;
			});
			const element0 = currentFolder.children.nodes[0] as Node;
			const element1 = currentFolder.children.nodes[1] as Node;
			const element2 = currentFolder.children.nodes[2] as Node;

			const mocks = [mockGetChild({ node_id: currentFolder.id, shares_limit: 1 }, currentFolder)];

			const { user } = setup(
				<List
					folderId={currentFolder.id}
					fillerWithActions={<EmptySpaceFiller actions={[]} />}
					nodes={currentFolder.children.nodes as Array<Node>}
					mainList
					emptyListMessage={'hint'}
				/>,
				{ mocks }
			);

			await selectNodes([element0.id, element1.id], user);

			// right click to open contextual menu
			const nodeItem = screen.getByTestId(`node-item-${element0.id}`);
			fireEvent.contextMenu(nodeItem);

			const moveToTrashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(moveToTrashAction).toBeVisible();

			const moveAction = await screen.findByText(ACTION_REGEXP.move);
			expect(moveAction).toBeVisible();

			const copyAction = await screen.findByText(ACTION_REGEXP.copy);
			expect(copyAction).toBeVisible();

			const flagAction = await screen.findByText(ACTION_REGEXP.flag);
			expect(flagAction).toBeVisible();

			act(() => {
				// run timers of dropdown
				jest.runOnlyPendingTimers();
			});

			expect(screen.queryByText(ACTION_REGEXP.openDocument)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.download)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.unflag)).not.toBeInTheDocument();

			// right click on unSelected node close open contextual menu
			const nodeItem2 = screen.getByTestId(`node-item-${element2.id}`);
			fireEvent.contextMenu(nodeItem2);

			expect(moveToTrashAction).not.toBeVisible();
			expect(copyAction).not.toBeVisible();
			expect(flagAction).not.toBeVisible();
		});
	});

	test('right click on node open the contextual menu for the node, closing a previously opened one. Left click close it', async () => {
		const currentFolder = populateFolder();
		const node1 = populateNode();
		// set the node not flagged so that we can search by flag action in the contextual menu of first node
		node1.flagged = false;
		currentFolder.children.nodes.push(node1);
		const node2 = populateNode();
		// set the second node flagged so that we can search by unflag action in the contextual menu of second node
		node2.flagged = true;
		currentFolder.children.nodes.push(node2);

		const mocks = [mockGetChild({ node_id: currentFolder.id, shares_limit: 1 }, currentFolder)];

		const { user } = setup(
			<List
				folderId={currentFolder.id}
				fillerWithActions={<EmptySpaceFiller actions={[]} />}
				nodes={currentFolder.children.nodes as Array<Node>}
				mainList
				emptyListMessage={'hint'}
			/>,
			{ mocks }
		);

		// right click to open contextual menu
		const node1Item = screen.getByTestId(`node-item-${node1.id}`);
		const node2Item = screen.getByTestId(`node-item-${node2.id}`);
		fireEvent.contextMenu(node1Item);
		// check that the flag action becomes visible (contextual menu of first node)
		const flagAction = await screen.findByText(ACTION_REGEXP.flag);
		expect(flagAction).toBeVisible();
		// right click on second node
		fireEvent.contextMenu(node2Item);
		// check that the unflag action becomes visible (contextual menu of second node)
		const unflagAction = await screen.findByText(ACTION_REGEXP.unflag);
		expect(unflagAction).toBeVisible();
		// check that the flag action becomes invisible (contextual menu of first node is closed)
		expect(flagAction).not.toBeInTheDocument();
		// left click close all the contextual menu
		await user.click(node2Item);
		expect(unflagAction).not.toBeInTheDocument();
		expect(flagAction).not.toBeInTheDocument();
	});
});
