/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */

import React from 'react';

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { forEach, map } from 'lodash';

import { destinationVar } from '../../apollo/destinationVar';
import { NODES_LOAD_LIMIT } from '../../constants';
import { ACTION_REGEXP, SELECTORS } from '../../constants/test';
import {
	populateFile,
	populateFolder,
	populateNode,
	populateNodePage,
	populateParents
} from '../../mocks/mockUtils';
import {
	File,
	Folder,
	GetChildrenQuery,
	GetChildrenQueryVariables,
	Maybe
} from '../../types/graphql/types';
import {
	getChildrenVariables,
	mockGetChildren,
	mockGetPath,
	mockMoveNodes
} from '../../utils/mockUtils';
import { buildBreadCrumbRegExp, setup, selectNodes, triggerLoadMore } from '../../utils/testUtils';
import { MoveNodesModalContent } from './MoveNodesModalContent';

const resetToDefault = jest.fn(() => {
	// clone implementation of the function contained in the click callback of useCopyContent
	destinationVar({ ...destinationVar(), currentValue: destinationVar().defaultValue });
});

beforeEach(() => {
	resetToDefault.mockClear();
});

describe('Move Nodes Modal', () => {
	test('if a folder id is provided, list shows content of the folder', async () => {
		const currentFolder = populateFolder(5);
		const nodesToMove = [currentFolder.children.nodes[0] as File | Folder];
		const mocks = [
			mockGetPath({ node_id: currentFolder.id }, [currentFolder]),
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder)
		];

		setup(
			<div onClick={resetToDefault}>
				<MoveNodesModalContent folderId={currentFolder.id} nodesToMove={nodesToMove} />
			</div>,
			{
				mocks
			}
		);
		await screen.findByText((currentFolder.children.nodes[0] as File | Folder).name);
		expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);
	});

	test('folders without permission, files and moving nodes are disabled in the list and not navigable', async () => {
		const currentFolder = populateFolder();
		const folderWithWriteFile = populateFolder(1);
		folderWithWriteFile.permissions.can_write_file = true;
		folderWithWriteFile.permissions.can_write_folder = false;
		currentFolder.children.nodes.push(folderWithWriteFile);
		const folderWithWriteFolder = populateFolder(1);
		folderWithWriteFolder.permissions.can_write_file = false;
		folderWithWriteFolder.permissions.can_write_folder = true;
		currentFolder.children.nodes.push(folderWithWriteFolder);
		const file = populateFile();
		file.permissions.can_write_file = true;
		currentFolder.children.nodes.push(file);
		const folder = populateFolder();
		folder.permissions.can_write_folder = true;
		folder.permissions.can_write_file = true;
		currentFolder.children.nodes.push(folder);

		// first move file -> folderWithWriteFolder is disabled
		let nodesToMove: Array<File | Folder> = [file];
		const mocks = [
			mockGetPath({ node_id: currentFolder.id }, [currentFolder]),
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
			mockGetPath({ node_id: folderWithWriteFile.id }, [currentFolder, folderWithWriteFile]),
			mockGetChildren(getChildrenVariables(folderWithWriteFile.id), folderWithWriteFile),
			mockGetPath({ node_id: folderWithWriteFolder.id }, [currentFolder, folderWithWriteFolder]),
			mockGetChildren(getChildrenVariables(folderWithWriteFolder.id), folderWithWriteFolder)
		];
		const { rerender, user } = setup(
			<div onClick={resetToDefault}>
				<MoveNodesModalContent folderId={currentFolder.id} nodesToMove={nodesToMove} />
			</div>,
			{ mocks }
		);
		await screen.findByText((currentFolder.children.nodes[0] as File | Folder).name);
		let folderWithWriteFolderItem = screen.getByText(folderWithWriteFolder.name);
		let folderWithWriteFileItem = screen.getByText(folderWithWriteFile.name);
		let fileItem = screen.getByText(file.name);
		let folderItem = screen.getByText(folder.name);
		// folder without write file permission is disabled and not navigable
		expect(folderWithWriteFolderItem).toHaveAttribute('disabled', '');
		// double-click on a disabled folder does nothing
		await user.dblClick(folderWithWriteFolderItem);
		expect(folderWithWriteFolderItem).toBeVisible();
		expect(folderWithWriteFolderItem).toHaveAttribute('disabled', '');
		// folder is active
		expect(folderItem).not.toHaveAttribute('disabled', '');
		// file is disabled
		expect(fileItem).toHaveAttribute('disabled', '');
		// folder with write file permission is active and navigable
		expect(folderWithWriteFileItem).toBeVisible();
		expect(folderWithWriteFileItem).not.toHaveAttribute('disabled', '');
		await user.dblClick(folderWithWriteFileItem);
		// navigate to sub-folder
		await screen.findByText((folderWithWriteFile.children.nodes[0] as File | Folder).name);
		expect(folderWithWriteFileItem).not.toBeInTheDocument();

		// then move folder
		nodesToMove = [folder];
		rerender(
			<div onClick={resetToDefault}>
				<MoveNodesModalContent folderId={currentFolder.id} nodesToMove={nodesToMove} />
			</div>
		);
		await screen.findByText((currentFolder.children.nodes[0] as File | Folder).name);
		folderWithWriteFolderItem = screen.getByText(folderWithWriteFolder.name);
		folderWithWriteFileItem = screen.getByText(folderWithWriteFile.name);
		fileItem = screen.getByText(file.name);
		folderItem = screen.getByText(folder.name);
		// folder without write folder permission is disabled and not navigable
		expect(folderWithWriteFileItem).toHaveAttribute('disabled', '');
		// double-click on a disabled folder does nothing
		await user.dblClick(folderWithWriteFileItem);
		expect(folderWithWriteFileItem).toBeVisible();
		expect(folderWithWriteFileItem).toHaveAttribute('disabled', '');
		// moving folder is disabled
		expect(folderItem).toHaveAttribute('disabled', '');
		// file is disabled
		expect(fileItem).toHaveAttribute('disabled', '');
		// folder with write folder permission is active and navigable
		expect(folderWithWriteFolderItem).toBeVisible();
		expect(folderWithWriteFolderItem).not.toHaveAttribute('disabled', '');
		await user.dblClick(folderWithWriteFolderItem);
		// navigate to sub-folder
		await screen.findByText((folderWithWriteFolder.children.nodes[0] as File | Folder).name);
		expect(folderWithWriteFolderItem).not.toBeInTheDocument();
	});

	test('node actions are not shown', async () => {
		const currentFolder = populateFolder();
		const file = populateFile();
		const folder = populateFolder();
		folder.permissions.can_write_file = true;
		folder.flagged = false;
		currentFolder.children.nodes.push(file, folder);

		const nodesToMove = [file];
		const mocks = [
			mockGetPath({ node_id: currentFolder.id }, [currentFolder]),
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder)
		];
		const { user } = setup(
			<div onClick={resetToDefault}>
				<MoveNodesModalContent folderId={currentFolder.id} nodesToMove={nodesToMove} />
			</div>,
			{
				mocks
			}
		);
		const folderItem = await screen.findByText(folder.name);
		// context menu
		fireEvent.contextMenu(folderItem);
		// wait a tick to be sure eventual context menu has time to open
		await waitFor(
			() =>
				new Promise((resolve) => {
					setTimeout(resolve, 0);
				})
		);
		expect(screen.queryByText(ACTION_REGEXP.flag)).not.toBeInTheDocument();
		// hover bar
		expect(screen.queryByTestId('icon: FlagOutline')).not.toBeInTheDocument();
		// selection mode
		await selectNodes([folder.id], user);
		// wait a tick to be sure eventual selection icon is shown
		await waitFor(
			() =>
				new Promise((resolve) => {
					setTimeout(resolve, 0);
				})
		);
		expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
	});

	test('confirm action without selecting a destination moves node in opened folder. Confirm button is disabled if destination folder matches origin folder', async () => {
		const currentFolder = populateFolder();
		const file = populateFile();
		file.permissions.can_write_file = true;
		file.parent = currentFolder;
		currentFolder.children.nodes.push(file);
		const folder = populateFolder(0);
		folder.permissions.can_write_folder = true;
		folder.permissions.can_write_file = true;
		folder.parent = currentFolder;
		currentFolder.children.nodes.push(folder);

		const nodesToMove: Array<File | Folder> = [file];
		const mocks = [
			mockGetPath({ node_id: currentFolder.id }, [currentFolder]),
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
			mockGetPath({ node_id: folder.id }, [currentFolder, folder]),
			mockGetChildren(getChildrenVariables(folder.id), folder),
			mockMoveNodes(
				{ node_ids: map(nodesToMove, (node) => node.id), destination_id: folder.id },
				map(nodesToMove, (node) => ({ ...node, parent: folder }))
			)
		];

		const closeAction = jest.fn();

		const { user } = setup(
			<div onClick={resetToDefault}>
				<MoveNodesModalContent
					folderId={currentFolder.id}
					nodesToMove={nodesToMove}
					closeAction={closeAction}
				/>
			</div>,
			{ mocks }
		);

		const folderItem = await screen.findByText(folder.name);
		const confirmButton = screen.getByRole('button', { name: ACTION_REGEXP.move });
		expect(confirmButton).toHaveAttribute('disabled', '');
		const confirmButtonLabel = within(confirmButton).getByText(ACTION_REGEXP.move);
		await user.hover(confirmButtonLabel);
		await screen.findByText(/you can't perform this action here/i);
		expect(screen.getByText(/you can't perform this action here/i)).toBeVisible();
		await user.unhover(confirmButtonLabel);
		expect(screen.queryByText(/you can't perform this action here/i)).not.toBeInTheDocument();
		await user.click(folderItem);
		expect(confirmButtonLabel).not.toHaveAttribute('disabled', '');
		await user.dblClick(folderItem);
		await screen.findByText(/It looks like there's nothing here./i);
		expect(confirmButtonLabel).not.toHaveAttribute('disabled', '');
		await user.click(confirmButtonLabel);
		await waitFor(() => expect(closeAction).toHaveBeenCalled());
		await screen.findByText(/item moved/i);
		await waitFor(() => {
			const currentFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>(mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder).request);
			expect(
				(currentFolderCachedData?.getNode as Maybe<Folder> | undefined)?.children.nodes || []
			).toHaveLength(currentFolder.children.nodes.length - nodesToMove.length);
		});
	});

	test('confirm action after selecting a destination from the list moves node in selected destination', async () => {
		const currentFolder = populateFolder();
		const file = populateFile();
		file.permissions.can_write_file = true;
		file.parent = currentFolder;
		currentFolder.children.nodes.push(file);
		const folder = populateFolder(0);
		folder.permissions.can_write_folder = true;
		folder.permissions.can_write_file = true;
		folder.parent = currentFolder;
		currentFolder.children.nodes.push(folder);

		const nodesToMove = [file];
		const mocks = [
			mockGetPath({ node_id: currentFolder.id }, [currentFolder]),
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
			mockMoveNodes(
				{ node_ids: map(nodesToMove, (node) => node.id), destination_id: folder.id },
				map(nodesToMove, (node) => ({ ...node, parent: folder }))
			)
		];

		const closeAction = jest.fn();

		const { user } = setup(
			<div onClick={resetToDefault}>
				<MoveNodesModalContent
					folderId={currentFolder.id}
					nodesToMove={nodesToMove}
					closeAction={closeAction}
				/>
			</div>,
			{ mocks }
		);

		const folderItem = await screen.findByText(folder.name);
		const confirmButton = screen.getByRole('button', { name: ACTION_REGEXP.move });
		expect(confirmButton).toHaveAttribute('disabled', '');
		await user.click(folderItem);
		expect(confirmButton).not.toHaveAttribute('disabled', '');
		await user.click(confirmButton);
		await waitFor(() => expect(closeAction).toHaveBeenCalled());
		await screen.findByText(/item moved/i);
		await waitFor(() => {
			const currentFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>(mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder).request);
			expect(
				(currentFolderCachedData?.getNode as Maybe<Folder> | undefined)?.children.nodes || []
			).toHaveLength(currentFolder.children.nodes.length - nodesToMove.length);
		});
		const folderCachedData = global.apolloClient.readQuery<
			GetChildrenQuery,
			GetChildrenQueryVariables
		>(mockGetChildren(getChildrenVariables(folder.id), folder).request);
		expect(folderCachedData).toBeNull();
	});

	test('click on disabled nodes or outside the list reset selected destination to opened folder. Click on filter input does not reset selected destination', async () => {
		const currentFolder = populateFolder();
		const file = populateFile();
		file.permissions.can_write_file = true;
		currentFolder.children.nodes.push(file);
		const folder = populateFolder(0);
		folder.permissions.can_write_folder = true;
		folder.permissions.can_write_file = true;
		currentFolder.children.nodes.push(folder);

		const nodesToMove = [file];
		const mocks = [
			mockGetPath({ node_id: currentFolder.id }, [currentFolder]),
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder)
		];

		const closeAction = jest.fn();

		const { user } = setup(
			<div onClick={resetToDefault}>
				<MoveNodesModalContent
					folderId={currentFolder.id}
					nodesToMove={nodesToMove}
					closeAction={closeAction}
				/>
			</div>,
			{ mocks }
		);

		const folderItem = await screen.findByText(folder.name);
		const fileItem = screen.getByText(file.name);
		const confirmButton = screen.getByRole('button', { name: ACTION_REGEXP.move });
		expect(confirmButton).toHaveAttribute('disabled', '');
		// click on valid destination folder
		await user.click(folderItem);
		// confirm button becomes active
		await waitFor(() => expect(confirmButton).not.toHaveAttribute('disabled', ''));
		// click on disabled node
		await user.click(fileItem);
		expect(confirmButton).toHaveAttribute('disabled', '');
		// click again on valid destination folder
		await user.click(folderItem);
		// confirm button becomes active
		await waitFor(() => expect(confirmButton).not.toHaveAttribute('disabled', ''));
		// click on modal title
		await user.click(screen.getByText(/move items/i));
	});

	test('breadcrumb shows full path of opened folder and allows navigation to parent nodes', async () => {
		const currentFolder = populateFolder();
		const { path } = populateParents(currentFolder, 4, true);
		forEach(path, (mockedNode) => {
			mockedNode.permissions.can_write_file = true;
		});
		const file = populateFile();
		file.parent = currentFolder;
		const folder = populateFolder();
		folder.parent = currentFolder;
		folder.permissions.can_write_file = true;
		currentFolder.children.nodes.push(file, folder);
		const nodesToMove = [file];
		const ancestorIndex = 1;
		const ancestor = path[ancestorIndex] as Folder;
		ancestor.children.nodes = [path[ancestorIndex + 1]];
		const mocks = [
			mockGetPath({ node_id: currentFolder.id }, path),
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
			mockGetPath({ node_id: folder.id }, path.concat(folder)),
			mockGetChildren(getChildrenVariables(folder.id), folder),
			mockGetPath({ node_id: ancestor.id }, path.slice(0, ancestorIndex + 1)),
			mockGetChildren(getChildrenVariables(ancestor.id), ancestor)
		];

		const { getByTextWithMarkup, findByTextWithMarkup, user } = setup(
			<div onClick={resetToDefault}>
				<MoveNodesModalContent folderId={currentFolder.id} nodesToMove={nodesToMove} />
			</div>,
			{ mocks }
		);

		await screen.findByText(nodesToMove[0].name);
		let breadcrumbRegexp = buildBreadCrumbRegExp(...map(path, (node) => node.name));
		await findByTextWithMarkup(breadcrumbRegexp);
		// full path immediately visible
		expect(getByTextWithMarkup(breadcrumbRegexp)).toBeVisible();
		// navigate to sub-folder
		await user.dblClick(screen.getByText(folder.name));
		breadcrumbRegexp = buildBreadCrumbRegExp(...map(path.concat(folder), (node) => node.name));
		const breadcrumbItem = await findByTextWithMarkup(breadcrumbRegexp);
		expect(breadcrumbItem).toBeVisible();
		// navigate to ancestor
		await user.click(screen.getByText(ancestor.name));
		// wait children to be loaded
		breadcrumbRegexp = buildBreadCrumbRegExp(
			...map(path.slice(0, ancestorIndex + 1), (node) => node.name)
		);
		await findByTextWithMarkup(breadcrumbRegexp);
		expect(getByTextWithMarkup(breadcrumbRegexp)).toBeVisible();
		expect(screen.queryByText(currentFolder.name)).not.toBeInTheDocument();
		expect.assertions(4);
	});

	test('breadcrumb of a shared node shows only parents that have write permissions', async () => {
		const nodeToMove = populateNode(undefined, undefined, 'nodeToMove');
		const sharedFolder = populateFolder(0, undefined, 'sharedFolder');
		sharedFolder.permissions.can_write_folder = true;
		sharedFolder.permissions.can_write_file = true;
		sharedFolder.children.nodes = [nodeToMove];
		nodeToMove.parent = sharedFolder;
		const sharedParentWithWritePermissions = populateFolder(
			0,
			undefined,
			'sharedParentWithWritePermissions'
		);
		sharedParentWithWritePermissions.permissions.can_write_file = true;
		sharedParentWithWritePermissions.permissions.can_write_folder = true;
		sharedParentWithWritePermissions.children.nodes = [sharedFolder];
		sharedFolder.parent = sharedParentWithWritePermissions;
		const sharedAncestorWithoutWritePermissions = populateFolder(
			0,
			undefined,
			'sharedAncestorWithoutWritePermissions'
		);
		sharedAncestorWithoutWritePermissions.permissions.can_write_file = false;
		sharedAncestorWithoutWritePermissions.permissions.can_write_folder = false;
		sharedAncestorWithoutWritePermissions.children.nodes = [sharedParentWithWritePermissions];
		sharedParentWithWritePermissions.parent = sharedAncestorWithoutWritePermissions;
		const sharedGrandAncestorWithWritePermissions = populateFolder(
			0,
			undefined,
			'sharedGrandAncestorWithWritePermissions'
		);
		sharedGrandAncestorWithWritePermissions.permissions.can_write_file = true;
		sharedGrandAncestorWithWritePermissions.permissions.can_write_folder = true;
		sharedGrandAncestorWithWritePermissions.children.nodes = [
			sharedAncestorWithoutWritePermissions
		];
		sharedAncestorWithoutWritePermissions.parent = sharedGrandAncestorWithWritePermissions;

		const path = [
			sharedGrandAncestorWithWritePermissions,
			sharedAncestorWithoutWritePermissions,
			sharedParentWithWritePermissions,
			sharedFolder
		];

		const mocks = [
			mockGetPath({ node_id: sharedFolder.id }, path),
			mockGetChildren(getChildrenVariables(sharedFolder.id), sharedFolder)
		];

		const { getByTextWithMarkup } = setup(
			<div onClick={resetToDefault}>
				<MoveNodesModalContent folderId={sharedFolder.id} nodesToMove={[nodeToMove]} />
			</div>,
			{ mocks }
		);

		await screen.findByText(nodeToMove.name);

		// grand ancestor is not in breadcrumb because it is before a folder without permissions
		expect(
			screen.queryByText(sharedGrandAncestorWithWritePermissions.name, { exact: false })
		).not.toBeInTheDocument();
		// ancestor is not in breadcrumb because it has not write permissions
		expect(
			screen.queryByText(sharedAncestorWithoutWritePermissions.name, { exact: false })
		).not.toBeInTheDocument();
		// breadcrumb has only last subsequent folders with write permissions
		expect(
			getByTextWithMarkup(
				buildBreadCrumbRegExp(sharedParentWithWritePermissions.name, sharedFolder.name)
			)
		).toBeVisible();
	});

	test('scroll trigger pagination', async () => {
		const currentFolder = populateFolder(NODES_LOAD_LIMIT * 2 - 1);
		const nodesToMove = [currentFolder.children.nodes[0] as File | Folder];
		const mocks = [
			mockGetPath({ node_id: currentFolder.id }, [currentFolder]),
			mockGetChildren(getChildrenVariables(currentFolder.id), {
				...currentFolder,
				children: populateNodePage(currentFolder.children.nodes.slice(0, NODES_LOAD_LIMIT))
			} as Folder),
			mockGetChildren(
				getChildrenVariables(currentFolder.id, undefined, undefined, undefined, true),
				{
					...currentFolder,
					children: populateNodePage(currentFolder.children.nodes.slice(NODES_LOAD_LIMIT))
				} as Folder
			)
		];

		setup(
			<div onClick={resetToDefault}>
				<MoveNodesModalContent folderId={currentFolder.id} nodesToMove={nodesToMove} />
			</div>,
			{
				mocks
			}
		);
		await screen.findByText((currentFolder.children.nodes[0] as File | Folder).name);
		expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(NODES_LOAD_LIMIT);
		expect(screen.getByTestId('icon: Refresh')).toBeInTheDocument();
		expect(screen.getByTestId('icon: Refresh')).toBeVisible();
		await triggerLoadMore();
		await screen.findByText(
			(currentFolder.children.nodes[currentFolder.children.nodes.length - 1] as File | Folder).name
		);
		expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);
		expect(screen.queryByTestId('icon: Refresh')).not.toBeInTheDocument();
	});
});
