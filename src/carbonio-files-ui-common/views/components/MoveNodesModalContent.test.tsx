/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */

import React from 'react';

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { forEach, map } from 'lodash';

import { MoveNodesModalContent } from './MoveNodesModalContent';
import { destinationVar } from '../../apollo/destinationVar';
import { NODES_LOAD_LIMIT } from '../../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateFile, populateFolder, populateNode, populateParents } from '../../mocks/mockUtils';
import { Node } from '../../types/common';
import { Resolvers } from '../../types/graphql/resolvers-types';
import {
	File,
	Folder,
	GetChildrenDocument,
	GetChildrenQuery,
	GetChildrenQueryVariables,
	Maybe
} from '../../types/graphql/types';
import {
	getChildrenVariables,
	mockGetNode,
	mockGetPath,
	mockMoveNodes
} from '../../utils/resolverMocks';
import { buildBreadCrumbRegExp, setup, selectNodes, triggerLoadMore } from '../../utils/testUtils';

describe('Move Nodes Modal', () => {
	function resetToDefault(): void {
		// clone implementation of the function contained in the click callback of useCopyContent
		destinationVar({ ...destinationVar(), currentValue: destinationVar().defaultValue });
	}
	test('if a folder id is provided, list shows content of the folder', async () => {
		const currentFolder = populateFolder(5);
		const nodesToMove = [currentFolder.children.nodes[0] as File | Folder];
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder] })
			}
		} satisfies Partial<Resolvers>;

		setup(
			<div onClick={resetToDefault}>
				<MoveNodesModalContent folderId={currentFolder.id} nodesToMove={nodesToMove} />
			</div>,
			{
				mocks
			}
		);
		await screen.findByText((currentFolder.children.nodes[0] as File | Folder).name);
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);
	});

	describe.each<NonNullable<Node['__typename']>>(['File', 'Folder'])(
		'when moving a %s',
		(typename) => {
			const nodeToMove = populateNode(typename);
			nodeToMove.permissions.can_write_file = true;
			nodeToMove.permissions.can_write_folder = true;

			test('files are disabled in the list', async () => {
				const currentFolder = populateFolder();
				currentFolder.children.nodes.push(nodeToMove);
				const file = populateFile();
				file.permissions.can_write_file = true;
				currentFolder.children.nodes.push(file);

				const mocks = {
					Query: {
						getPath: mockGetPath([currentFolder]),
						getNode: mockGetNode({ getChildren: [currentFolder] })
					}
				} satisfies Partial<Resolvers>;
				setup(
					<div onClick={resetToDefault}>
						<MoveNodesModalContent folderId={currentFolder.id} nodesToMove={[nodeToMove]} />
					</div>,
					{ mocks }
				);
				await screen.findByText(file.name);
				const nodeItem = screen.getByText(file.name);
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(nodeItem).toHaveAttribute('disabled', '');
			});

			test(`folders without can_write_${typename.toLowerCase()} permissions are disabled in the list`, async () => {
				const currentFolder = populateFolder();
				currentFolder.children.nodes.push(nodeToMove);
				const folder = populateFolder();
				// enable both permissions, and then disable the specific one
				folder.permissions.can_write_folder = true;
				folder.permissions.can_write_file = true;
				folder.permissions[
					`can_write_${typename.toLowerCase() as Lowercase<NonNullable<Node['__typename']>>}`
				] = false;
				currentFolder.children.nodes.push(folder);

				const mocks = {
					Query: {
						getPath: mockGetPath([currentFolder]),
						getNode: mockGetNode({ getChildren: [currentFolder] })
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(
					<div onClick={resetToDefault}>
						<MoveNodesModalContent folderId={currentFolder.id} nodesToMove={[nodeToMove]} />
					</div>,
					{ mocks }
				);
				await screen.findByText(folder.name);
				const nodeItem = screen.getByText(folder.name);
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(nodeItem).toHaveAttribute('disabled', '');
				await user.dblClick(nodeItem);
				expect(nodeItem).toBeVisible();
			});

			test('folders with can_write permission are enabled and navigable in the list', async () => {
				const currentFolder = populateFolder();
				currentFolder.children.nodes.push(nodeToMove);
				const folder = populateFolder();
				folder.permissions.can_write_file = true;
				folder.permissions.can_write_folder = true;
				currentFolder.children.nodes.push(folder);

				const mocks = {
					Query: {
						getPath: mockGetPath([currentFolder], [currentFolder, folder]),
						getNode: mockGetNode({ getChildren: [currentFolder, folder] })
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(
					<div onClick={resetToDefault}>
						<MoveNodesModalContent folderId={currentFolder.id} nodesToMove={[nodeToMove]} />
					</div>,
					{ mocks }
				);
				await screen.findByText(folder.name);
				const nodeItem = screen.getByText(folder.name);
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(nodeItem).not.toHaveAttribute('disabled', '');
				await user.dblClick(nodeItem);
				await screen.findByText(/it looks like there's nothing here/i);
			});

			test('moving node is disabled in the list', async () => {
				const currentFolder = populateFolder();
				currentFolder.children.nodes.push(nodeToMove);

				const mocks = {
					Query: {
						getPath: mockGetPath([currentFolder]),
						getNode: mockGetNode({ getChildren: [currentFolder] })
					}
				} satisfies Partial<Resolvers>;
				setup(
					<div onClick={resetToDefault}>
						<MoveNodesModalContent folderId={currentFolder.id} nodesToMove={[nodeToMove]} />
					</div>,
					{ mocks }
				);
				await screen.findByText(nodeToMove.name);
				const nodeItem = screen.getByText(nodeToMove.name);
				// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
				expect(nodeItem).toHaveAttribute('disabled', '');
			});
		}
	);

	test('node actions are not shown', async () => {
		const currentFolder = populateFolder();
		const file = populateFile();
		const folder = populateFolder();
		folder.permissions.can_write_file = true;
		folder.flagged = false;
		currentFolder.children.nodes.push(file, folder);

		const nodesToMove = [file];
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder] })
			}
		} satisfies Partial<Resolvers>;
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
		act(() => {
			jest.runOnlyPendingTimers();
		});
		expect(screen.queryByText(ACTION_REGEXP.flag)).not.toBeInTheDocument();
		// hover bar
		expect(screen.queryByTestId(ICON_REGEXP.flag)).not.toBeInTheDocument();
		// selection mode
		await selectNodes([folder.id], user);
		act(() => {
			jest.runOnlyPendingTimers();
		});
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
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder], [currentFolder, folder]),
				getNode: mockGetNode({ getChildren: [currentFolder, folder] })
			},
			Mutation: {
				moveNodes: mockMoveNodes(map(nodesToMove, (node) => ({ ...node, parent: folder })))
			}
		} satisfies Partial<Resolvers>;

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
		expect(confirmButton).toBeDisabled();
		const confirmButtonLabel = within(confirmButton).getByText(ACTION_REGEXP.move);
		await user.hover(confirmButtonLabel);
		await screen.findByText(/you can't perform this action here/i);
		expect(screen.getByText(/you can't perform this action here/i)).toBeVisible();
		await user.unhover(confirmButtonLabel);
		expect(screen.queryByText(/you can't perform this action here/i)).not.toBeInTheDocument();
		await user.click(folderItem);
		expect(confirmButton).toBeEnabled();
		await user.dblClick(folderItem);
		await screen.findByText(/It looks like there's nothing here./i);
		expect(confirmButton).toBeEnabled();
		await user.click(confirmButton);
		await waitFor(() => expect(closeAction).toHaveBeenCalled());
		await screen.findByText(/item moved/i);
		await waitFor(() => {
			const currentFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(currentFolder.id)
			});
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
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder] })
			},
			Mutation: {
				moveNodes: mockMoveNodes(map(nodesToMove, (node) => ({ ...node, parent: folder })))
			}
		} satisfies Partial<Resolvers>;

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
		expect(confirmButton).toBeDisabled();
		await user.click(folderItem);
		expect(confirmButton).toBeEnabled();
		await user.click(confirmButton);
		await waitFor(() => expect(closeAction).toHaveBeenCalled());
		await screen.findByText(/item moved/i);
		await waitFor(() => {
			const currentFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GetChildrenDocument,
				variables: getChildrenVariables(currentFolder.id)
			});
			expect(
				(currentFolderCachedData?.getNode as Maybe<Folder> | undefined)?.children.nodes || []
			).toHaveLength(currentFolder.children.nodes.length - nodesToMove.length);
		});
		const folderCachedData = global.apolloClient.readQuery<
			GetChildrenQuery,
			GetChildrenQueryVariables
		>({
			query: GetChildrenDocument,
			variables: getChildrenVariables(folder.id)
		});
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
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder] })
			}
		} satisfies Partial<Resolvers>;

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
		expect(confirmButton).toBeDisabled();
		// click on valid destination folder
		await user.click(folderItem);
		// confirm button becomes active
		await waitFor(() => expect(confirmButton).toBeEnabled());
		// click on disabled node
		await user.click(fileItem);
		expect(confirmButton).toBeDisabled();
		// click again on valid destination folder
		await user.click(folderItem);
		// confirm button becomes active
		await waitFor(() => expect(confirmButton).toBeEnabled());
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
		const mocks = {
			Query: {
				getPath: mockGetPath(path, path.concat(folder), path.slice(0, ancestorIndex + 1)),
				getNode: mockGetNode({ getChildren: [currentFolder, folder, ancestor] })
			}
		} satisfies Partial<Resolvers>;

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

		const mocks = {
			Query: {
				getPath: mockGetPath(path),
				getNode: mockGetNode({ getChildren: [sharedFolder] })
			}
		} satisfies Partial<Resolvers>;

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

		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder, currentFolder] })
			}
		} satisfies Partial<Resolvers>;

		setup(
			<div onClick={resetToDefault}>
				<MoveNodesModalContent folderId={currentFolder.id} nodesToMove={nodesToMove} />
			</div>,
			{
				mocks
			}
		);
		await screen.findByText((currentFolder.children.nodes[0] as File | Folder).name);
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			NODES_LOAD_LIMIT
		);
		expect(screen.getByTestId(ICON_REGEXP.queryLoading)).toBeInTheDocument();
		expect(screen.getByTestId(ICON_REGEXP.queryLoading)).toBeVisible();
		await triggerLoadMore();
		await screen.findByText(
			(currentFolder.children.nodes[currentFolder.children.nodes.length - 1] as File | Folder).name
		);
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);
		expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument();
	});
});
