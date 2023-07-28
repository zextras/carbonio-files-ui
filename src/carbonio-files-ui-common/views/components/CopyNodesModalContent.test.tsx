/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */

import React from 'react';

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { forEach, map } from 'lodash';

import { CopyNodesModalContent } from './CopyNodesModalContent';
import { destinationVar } from '../../apollo/destinationVar';
import { NODES_LOAD_LIMIT, ROOTS } from '../../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../../constants/test';
import GET_CHILDREN from '../../graphql/queries/getChildren.graphql';
import {
	populateFile,
	populateFolder,
	populateLocalRoot,
	populateNode,
	populateNodePage,
	populateNodes,
	populateParents
} from '../../mocks/mockUtils';
import { Node } from '../../types/common';
import { Resolvers } from '../../types/graphql/resolvers-types';
import {
	Folder,
	File,
	GetChildrenQuery,
	GetChildrenQueryVariables,
	Maybe,
	GetChildrenDocument
} from '../../types/graphql/types';
import { ArrayOneOrMore } from '../../types/utils';
import {
	getChildrenVariables,
	mockCopyNodes,
	mockFindNodes,
	mockGetNode,
	mockGetPath
} from '../../utils/resolverMocks';
import { buildBreadCrumbRegExp, setup, selectNodes, triggerLoadMore } from '../../utils/testUtils';

const resetToDefault = jest.fn(() => {
	// clone implementation of the function contained in the click callback of useCopyContent
	destinationVar({ ...destinationVar(), currentValue: destinationVar().defaultValue });
});

beforeEach(() => {
	resetToDefault.mockClear();
});

describe('Copy Nodes Modal', () => {
	test('if a folder id is provided, list shows content of the folder', async () => {
		const currentFolder = populateFolder(5);
		const nodesToCopy = [currentFolder.children.nodes[0] as File | Folder];
		const mocks = {
			Query: {
				getNode: mockGetNode(currentFolder),
				getPath: mockGetPath([currentFolder])
			}
		} satisfies Partial<Resolvers>;
		setup(
			<div onClick={resetToDefault}>
				<CopyNodesModalContent folderId={currentFolder.id} nodesToCopy={nodesToCopy} />
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

	test('if a folder id is not provided and only one node is going to be copied, list shows content of parent of the node', async () => {
		const parentFolder = populateFolder(5);
		const nodesToCopy = [parentFolder.children.nodes[0] as File | Folder];
		const mocks = {
			Query: {
				getNode: mockGetNode(parentFolder),
				getPath: mockGetPath([parentFolder])
			}
		} satisfies Partial<Resolvers>;
		const { findByTextWithMarkup } = setup(
			<div onClick={resetToDefault}>
				<CopyNodesModalContent nodesToCopy={nodesToCopy} />
			</div>,
			{
				mocks
			}
		);
		await screen.findByText((parentFolder.children.nodes[0] as File | Folder).name);
		await waitFor(() =>
			expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument()
		);
		await findByTextWithMarkup(buildBreadCrumbRegExp('Files', parentFolder.name));
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			parentFolder.children.nodes.length
		);
	});

	test('if a folder id is not provided and multiple nodes with same parent are going to be copied, list shows content of parent of the nodes', async () => {
		const parentFolder = populateFolder(5);
		const nodesToCopy = [
			parentFolder.children.nodes[0] as File | Folder,
			parentFolder.children.nodes[1] as File | Folder
		];
		const mocks = {
			Query: {
				getNode: mockGetNode(parentFolder),
				getPath: mockGetPath([parentFolder])
			}
		} satisfies Partial<Resolvers>;
		const { findByTextWithMarkup } = setup(
			<div onClick={resetToDefault}>
				<CopyNodesModalContent nodesToCopy={nodesToCopy} />
			</div>,
			{
				mocks
			}
		);
		await screen.findByText((parentFolder.children.nodes[0] as File | Folder).name);
		await waitFor(() =>
			expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument()
		);
		const breadcrumbRegexp = buildBreadCrumbRegExp('Files', parentFolder.name);
		const breadcrumb = await findByTextWithMarkup(breadcrumbRegexp);
		expect(breadcrumb).toBeVisible();
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			parentFolder.children.nodes.length
		);
		expect(screen.getByText(nodesToCopy[0].name)).toBeVisible();
		expect(screen.getByText(nodesToCopy[1].name)).toBeVisible();
	});

	test('if a folder id is not provided and multiple nodes with different parents are going to be copied, list shows roots', async () => {
		const nodesToCopy = populateNodes(2);
		forEach(nodesToCopy, (mockedNode) => {
			mockedNode.parent = populateFolder();
		});
		const { findByTextWithMarkup } = setup(
			<div onClick={resetToDefault}>
				<CopyNodesModalContent nodesToCopy={nodesToCopy} />
			</div>,
			{
				mocks: {}
			}
		);
		await screen.findByText('Home');
		expect(screen.getByText('Home')).toBeVisible();
		expect(screen.getByText('Shared with me')).toBeVisible();
		expect(screen.queryByText('Trash')).not.toBeInTheDocument();

		expect(screen.queryByText(nodesToCopy[0].name)).not.toBeInTheDocument();
		expect(screen.queryByText(nodesToCopy[1].name)).not.toBeInTheDocument();
		const breadcrumbRegexp = buildBreadCrumbRegExp('Files');
		const breadcrumb = await findByTextWithMarkup(breadcrumbRegexp);
		expect(breadcrumb).toBeVisible();
	});

	describe.each<NonNullable<Node['__typename']>>(['File', 'Folder'])(
		'when copying a %s',
		(typename) => {
			const nodeToCopy = populateNode(typename);
			nodeToCopy.permissions.can_write_file = true;
			nodeToCopy.permissions.can_write_folder = true;

			test('files are disabled in the list', async () => {
				const currentFolder = populateFolder();
				currentFolder.children.nodes.push(nodeToCopy);
				const file = populateFile();
				file.permissions.can_write_file = true;
				currentFolder.children.nodes.push(file);

				const mocks = {
					Query: {
						getNode: mockGetNode(currentFolder),
						getPath: mockGetPath([currentFolder])
					}
				} satisfies Partial<Resolvers>;
				setup(
					<div onClick={resetToDefault}>
						<CopyNodesModalContent folderId={currentFolder.id} nodesToCopy={[nodeToCopy]} />
					</div>,
					{ mocks }
				);
				await screen.findByText(file.name);
				const nodeItem = screen.getByText(file.name);
				expect(nodeItem).toHaveAttribute('disabled', '');
			});

			test(`folders without can_write_${typename.toLowerCase()} permission are disabled in the list`, async () => {
				const currentFolder = populateFolder();
				currentFolder.children.nodes.push(nodeToCopy);
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
						getNode: mockGetNode(currentFolder),
						getPath: mockGetPath([currentFolder])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(
					<div onClick={resetToDefault}>
						<CopyNodesModalContent folderId={currentFolder.id} nodesToCopy={[nodeToCopy]} />
					</div>,
					{ mocks }
				);
				await screen.findByText(folder.name);
				const nodeItem = screen.getByText(folder.name);
				expect(nodeItem).toHaveAttribute('disabled', '');
				await user.dblClick(nodeItem);
				expect(nodeItem).toBeVisible();
			});

			test('folders with can_write permission are enabled and navigable in the list', async () => {
				const currentFolder = populateFolder();
				currentFolder.children.nodes.push(nodeToCopy);
				const folder = populateFolder();
				folder.permissions.can_write_file = true;
				folder.permissions.can_write_folder = true;
				currentFolder.children.nodes.push(folder);

				const mocks = {
					Query: {
						getNode: mockGetNode(currentFolder, folder),
						getPath: mockGetPath([currentFolder], [currentFolder, folder])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(
					<div onClick={resetToDefault}>
						<CopyNodesModalContent folderId={currentFolder.id} nodesToCopy={[nodeToCopy]} />
					</div>,
					{ mocks }
				);
				await screen.findByText(folder.name);
				const nodeItem = screen.getByText(folder.name);
				expect(nodeItem).not.toHaveAttribute('disabled', '');
				await user.dblClick(nodeItem);
				await screen.findByText(/it looks like there's nothing here/i);
			});

			test('node to copy is disabled in the list', async () => {
				const currentFolder = populateFolder();
				currentFolder.children.nodes.push(nodeToCopy);

				const mocks = {
					Query: {
						getNode: mockGetNode(currentFolder),
						getPath: mockGetPath([currentFolder])
					}
				} satisfies Partial<Resolvers>;
				setup(
					<div onClick={resetToDefault}>
						<CopyNodesModalContent folderId={currentFolder.id} nodesToCopy={[nodeToCopy]} />
					</div>,
					{ mocks }
				);
				await screen.findByText(nodeToCopy.name);
				const nodeItem = screen.getByText(nodeToCopy.name);
				expect(nodeItem).toHaveAttribute('disabled', '');
			});
		}
	);

	test('roots are navigable, only local root is selectable', async () => {
		const nodesToCopy = populateNodes(2);
		const localRoot = populateFolder(2, ROOTS.LOCAL_ROOT, 'Home');
		const sharedWithMeFilter = populateNodes(3, 'Folder');
		sharedWithMeFilter[0].permissions.can_write_folder = true;
		sharedWithMeFilter[0].permissions.can_write_file = true;
		forEach(nodesToCopy, (mockedNode) => {
			mockedNode.parent = populateFolder();
		});
		const mocks = {
			Query: {
				getNode: mockGetNode(localRoot, sharedWithMeFilter[0]),
				getPath: mockGetPath([localRoot], [sharedWithMeFilter[0]]),
				findNodes: mockFindNodes(sharedWithMeFilter)
			}
		} satisfies Partial<Resolvers>;
		const { findByTextWithMarkup, user } = setup(
			<div onClick={resetToDefault}>
				<CopyNodesModalContent nodesToCopy={nodesToCopy} />
			</div>,
			{
				mocks
			}
		);
		const filesHome = await screen.findByText('Home');
		await user.click(filesHome);
		expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).toBeEnabled();
		// navigate inside local root
		await user.dblClick(filesHome);
		await screen.findByText((localRoot.children.nodes[0] as Node).name);
		await waitFor(() =>
			expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument()
		);
		let breadcrumb = await findByTextWithMarkup(buildBreadCrumbRegExp('Files', localRoot.name));
		expect(breadcrumb).toBeVisible();
		expect(screen.getByText((localRoot.children.nodes[0] as Node).name)).toBeVisible();
		expect(screen.getByText((localRoot.children.nodes[1] as Node).name)).toBeVisible();
		expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).toBeEnabled();

		// go back to roots list
		await user.click(screen.getByText('Files'));
		await screen.findByText('Home');
		const sharedWithMeItem = await screen.findByText('Shared with me');
		breadcrumb = await findByTextWithMarkup(buildBreadCrumbRegExp('Files'));
		expect(breadcrumb).toBeVisible();
		await user.click(sharedWithMeItem);
		expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).toBeDisabled();

		// navigate inside shared with me filter
		await user.dblClick(sharedWithMeItem);
		await screen.findByText(sharedWithMeFilter[0].name);
		// full breadcrumb is visible
		expect(screen.getByText(sharedWithMeFilter[0].name)).toBeVisible();
		expect(screen.getByText(sharedWithMeFilter[1].name)).toBeVisible();
		expect(screen.getByText(sharedWithMeFilter[2].name)).toBeVisible();
		breadcrumb = await findByTextWithMarkup(buildBreadCrumbRegExp('Files', 'Shared with me'));
		expect(breadcrumb).toBeVisible();
		expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).toBeDisabled();
		// select destination folder from filter
		await user.click(screen.getByText(sharedWithMeFilter[0].name));
		await waitFor(() =>
			expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).toBeEnabled()
		);
		// reset active node by clicking on modal title
		await user.click(screen.getByText('Copy items'));
		await waitFor(() =>
			expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).toBeDisabled()
		);

		// navigate inside folder of shared with me filter
		await user.dblClick(screen.getByText(sharedWithMeFilter[0].name));
		jest.advanceTimersToNextTimer();
		await screen.findByText(/It looks like there's nothing here./);
		breadcrumb = await findByTextWithMarkup(
			buildBreadCrumbRegExp('Files', sharedWithMeFilter[0].name)
		);
		// breadcrumb is updated
		expect(breadcrumb).toBeVisible();
		expect(screen.queryByText(sharedWithMeFilter[1].name)).not.toBeInTheDocument();
		expect(screen.queryByText(sharedWithMeFilter[2].name)).not.toBeInTheDocument();
		breadcrumb = await findByTextWithMarkup(
			buildBreadCrumbRegExp('Files', sharedWithMeFilter[0].name)
		);
		expect(breadcrumb).toBeVisible();
		expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).toBeEnabled();
	});

	test('node actions are not shown', async () => {
		const currentFolder = populateFolder();
		const file = populateFile();
		const folder = populateFolder();
		folder.permissions.can_write_file = true;
		folder.flagged = false;
		currentFolder.children.nodes.push(file, folder);

		const nodesToCopy = [file];
		const mocks = {
			Query: {
				getNode: mockGetNode(currentFolder),
				getPath: mockGetPath([currentFolder])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(
			<div onClick={resetToDefault}>
				<CopyNodesModalContent folderId={currentFolder.id} nodesToCopy={nodesToCopy} />
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
		// wait a tick to be sure eventual selection icon is shown

		expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
	});

	test('confirm action without selecting a destination copy node in opened folder. Confirm button is active if destination folder matches origin folder', async () => {
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

		const nodesToCopy = [file];
		const copiedNodes = map(nodesToCopy, (node) => ({
			...node,
			parent: folder,
			id: `new-id-${node.id}`,
			name: `Copy of ${node.name}`
		}));
		const mocks = {
			Query: {
				getNode: mockGetNode(currentFolder, {
					...currentFolder,
					children: populateNodePage([...currentFolder.children.nodes, ...copiedNodes])
				}),
				getPath: mockGetPath([currentFolder])
			},
			Mutation: {
				copyNodes: mockCopyNodes(copiedNodes)
			}
		} satisfies Partial<Resolvers>;

		const closeAction = jest.fn();

		const { user, findByTextWithMarkup } = setup(
			<div onClick={resetToDefault}>
				<CopyNodesModalContent
					folderId={currentFolder.id}
					nodesToCopy={nodesToCopy}
					closeAction={closeAction}
				/>
			</div>,
			{ mocks }
		);

		await screen.findByText(folder.name);
		await screen.findByText(nodesToCopy[0].name);
		await waitFor(() =>
			expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument()
		);
		await findByTextWithMarkup(buildBreadCrumbRegExp(currentFolder.name));
		const confirmButton = screen.getByRole('button', { name: ACTION_REGEXP.copy });
		expect(confirmButton).toBeEnabled();
		await user.click(confirmButton);
		await waitFor(() => expect(closeAction).toHaveBeenCalled());
		await screen.findByText(/item copied/i);
		await screen.findByText(copiedNodes[0].name);
		const currentFolderCachedData = global.apolloClient.readQuery<
			GetChildrenQuery,
			GetChildrenQueryVariables
		>({ query: GetChildrenDocument, variables: getChildrenVariables(currentFolder.id) });
		expect((currentFolderCachedData?.getNode as Maybe<Folder> | undefined)?.children).toBeDefined();
		expect((currentFolderCachedData?.getNode as Folder)?.children.nodes || []).toHaveLength(
			currentFolder.children.nodes.length + nodesToCopy.length
		);
	});

	test('confirm action without selecting a destination copy node in opened sub-folder', async () => {
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

		const nodesToCopy = [file];
		const copiedNodes = map(nodesToCopy, (node) => ({
			...node,
			parent: folder,
			id: `new-id-${node.id}`
		}));
		const mocks = {
			Query: {
				getNode: mockGetNode(currentFolder, folder, {
					...folder,
					children: populateNodePage(copiedNodes)
				}),
				getPath: mockGetPath([currentFolder], [currentFolder, folder])
			},
			Mutation: {
				copyNodes: mockCopyNodes(copiedNodes)
			}
		} satisfies Partial<Resolvers>;

		const closeAction = jest.fn();

		const { findByTextWithMarkup, user } = setup(
			<div onClick={resetToDefault}>
				<CopyNodesModalContent
					folderId={currentFolder.id}
					nodesToCopy={nodesToCopy}
					closeAction={closeAction}
				/>
			</div>,
			{ mocks }
		);

		const folderItem = await screen.findByText(folder.name);
		await waitFor(() =>
			expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument()
		);
		await findByTextWithMarkup(buildBreadCrumbRegExp('Files', currentFolder.name));
		const confirmButton = screen.getByRole('button', { name: ACTION_REGEXP.copy });
		expect(confirmButton).toBeEnabled();
		await user.click(folderItem);
		expect(confirmButton).toBeEnabled();
		await user.dblClick(folderItem);
		await screen.findByText(/It looks like there's nothing here./i);
		await findByTextWithMarkup(buildBreadCrumbRegExp('Files', currentFolder.name, folder.name));
		expect(confirmButton).toBeEnabled();
		await user.click(confirmButton);
		await waitFor(() => expect(closeAction).toHaveBeenCalled());
		await screen.findByText(/item copied/i);
		await screen.findByText(nodesToCopy[0].name);
		const currentFolderCachedData = global.apolloClient.readQuery<
			GetChildrenQuery,
			GetChildrenQueryVariables
		>({ query: GetChildrenDocument, variables: getChildrenVariables(currentFolder.id) });
		expect((currentFolderCachedData?.getNode as Maybe<Folder> | undefined)?.children).toBeDefined();
		expect(
			(currentFolderCachedData?.getNode as Maybe<Folder> | undefined)?.children.nodes || []
		).toHaveLength(currentFolder.children.nodes.length);
		const folderCachedData = global.apolloClient.readQuery<
			GetChildrenQuery,
			GetChildrenQueryVariables
		>({ query: GetChildrenDocument, variables: getChildrenVariables(folder.id) });
		expect((folderCachedData?.getNode as Maybe<Folder> | undefined)?.children).toBeDefined();
		expect((folderCachedData?.getNode as Folder)?.children.nodes || []).toHaveLength(
			nodesToCopy.length
		);
	});

	test('confirm action after selecting a destination from the list copy node in selected destination', async () => {
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

		const nodesToCopy = [file];
		const copiedNodes = map(nodesToCopy, (node) => ({
			...node,
			parent: folder,
			id: `new-id-${node.id}`
		}));
		const mocks = {
			Query: {
				getNode: mockGetNode(currentFolder),
				getPath: mockGetPath([currentFolder])
			},
			Mutation: {
				copyNodes: mockCopyNodes(copiedNodes)
			}
		} satisfies Partial<Resolvers>;

		const closeAction = jest.fn();

		const { user } = setup(
			<div onClick={resetToDefault}>
				<CopyNodesModalContent
					folderId={currentFolder.id}
					nodesToCopy={nodesToCopy}
					closeAction={closeAction}
				/>
			</div>,
			{ mocks }
		);

		const folderItem = await screen.findByText(folder.name);
		const confirmButton = screen.getByRole('button', { name: ACTION_REGEXP.copy });
		await user.click(folderItem);
		expect(confirmButton).toBeEnabled();
		await user.click(confirmButton);
		await waitFor(() => expect(closeAction).toHaveBeenCalled());
		await screen.findByText(/item copied/i);
		await waitFor(() => {
			const currentFolderCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({ query: GetChildrenDocument, variables: getChildrenVariables(currentFolder.id) });
			expect(
				(currentFolderCachedData?.getNode as Maybe<Folder> | undefined)?.children.nodes || []
			).toHaveLength(currentFolder.children.nodes.length);
		});
		const folderCachedData = global.apolloClient.readQuery<
			GetChildrenQuery,
			GetChildrenQueryVariables
		>({ query: GetChildrenDocument, variables: getChildrenVariables(folder.id) });
		expect(folderCachedData).toBeNull();
	});

	test('confirm action on local root from root list copy nodes in local root (local root is cached)', async () => {
		const currentFolder = populateFolder();
		const file = populateFile();
		file.permissions.can_write_file = true;
		file.parent = currentFolder;
		currentFolder.children.nodes.push(file);
		const localRoot = populateLocalRoot(2);
		localRoot.permissions.can_write_folder = true;
		localRoot.permissions.can_write_file = true;

		const nodesToCopy = [file];
		const copiedNodes = map(nodesToCopy, (node) => ({
			...node,
			parent: localRoot,
			id: `new-id-${node.id}`
		}));
		const mocks = {
			Query: {
				getNode: mockGetNode(currentFolder),
				getPath: mockGetPath([currentFolder])
			},
			Mutation: {
				copyNodes: mockCopyNodes(copiedNodes)
			}
		} satisfies Partial<Resolvers>;

		const closeAction = jest.fn();

		global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
			query: GET_CHILDREN,
			variables: getChildrenVariables(localRoot.id),
			data: {
				getNode: {
					...localRoot
				}
			}
		});

		const { findByTextWithMarkup, user } = setup(
			<div onClick={resetToDefault}>
				<CopyNodesModalContent
					folderId={currentFolder.id}
					nodesToCopy={nodesToCopy}
					closeAction={closeAction}
				/>
			</div>,
			{ mocks }
		);

		await screen.findByText(nodesToCopy[0].name);
		await waitFor(() =>
			expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument()
		);
		await findByTextWithMarkup(buildBreadCrumbRegExp('Files', currentFolder.name));
		let cachedData = global.apolloClient.readQuery<GetChildrenQuery, GetChildrenQueryVariables>({
			query: GetChildrenDocument,
			variables: getChildrenVariables(localRoot.id)
		});
		expect((cachedData?.getNode as Folder).children.nodes).toHaveLength(
			localRoot.children.nodes.length
		);
		await user.click(screen.getByText('Files'));
		await screen.findByText('Home');
		const confirmButton = screen.getByRole('button', { name: ACTION_REGEXP.copy });
		const confirmButtonLabel = within(confirmButton).getByText(ACTION_REGEXP.copy);
		expect(screen.getByText('Home')).toBeVisible();
		expect(screen.getByText(/shared with me/i)).toBeVisible();
		expect(confirmButton).toBeDisabled();
		// register tooltip listener
		jest.advanceTimersToNextTimer();
		await user.hover(confirmButtonLabel);
		act(() => {
			// run timers of tooltip
			jest.advanceTimersToNextTimer();
		});
		const tooltip = await screen.findByText(/you can't perform this action here/i);
		expect(tooltip).toBeVisible();
		await user.unhover(confirmButtonLabel);
		expect(tooltip).not.toBeInTheDocument();
		await user.click(screen.getByText('Home'));
		expect(confirmButton).toBeEnabled();
		await user.hover(confirmButtonLabel);
		// run timers of tooltip
		jest.advanceTimersToNextTimer();
		expect(screen.queryByText(/you can't perform this action here/i)).not.toBeInTheDocument();
		await user.click(confirmButton);
		await waitFor(() => expect(closeAction).toHaveBeenCalled());
		await screen.findByText(/item copied/i);
		expect(closeAction).toHaveBeenCalledTimes(1);
		cachedData = global.apolloClient.readQuery<GetChildrenQuery, GetChildrenQueryVariables>({
			query: GetChildrenDocument,
			variables: getChildrenVariables(localRoot.id)
		});
		expect(cachedData).toBeNull();
	});

	test('confirm action on local root from root list copy nodes in local root (local root is not cached)', async () => {
		const currentFolder = populateFolder();
		const file = populateFile();
		file.permissions.can_write_file = true;
		file.parent = currentFolder;
		currentFolder.children.nodes.push(file);
		const localRoot = populateLocalRoot(2);
		localRoot.permissions.can_write_folder = true;
		localRoot.permissions.can_write_file = true;

		const nodesToCopy = [file];
		const copiedNodes = map(nodesToCopy, (node) => ({
			...node,
			parent: localRoot,
			id: `new-id-${node.id}`
		}));
		const mocks = {
			Query: {
				getNode: mockGetNode(currentFolder),
				getPath: mockGetPath([currentFolder])
			},
			Mutation: {
				copyNodes: mockCopyNodes(copiedNodes)
			}
		} satisfies Partial<Resolvers>;
		const closeAction = jest.fn();

		const { findByTextWithMarkup, user } = setup(
			<div onClick={resetToDefault}>
				<CopyNodesModalContent
					folderId={currentFolder.id}
					nodesToCopy={nodesToCopy}
					closeAction={closeAction}
				/>
			</div>,
			{ mocks }
		);

		await screen.findByText(nodesToCopy[0].name);
		await waitFor(() =>
			expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument()
		);
		await findByTextWithMarkup(buildBreadCrumbRegExp('Files', currentFolder.name));
		await user.click(screen.getByText('Files'));
		await screen.findByText('Home');
		expect(screen.getByText('Home')).toBeVisible();
		expect(screen.getByText(/shared with me/i)).toBeVisible();
		const confirmButton = screen.getByRole('button', { name: ACTION_REGEXP.copy });
		expect(confirmButton).toBeDisabled();
		await user.click(screen.getByText('Home'));
		expect(confirmButton).toBeEnabled();
		await user.click(confirmButton);
		await waitFor(() => expect(closeAction).toHaveBeenCalled());
		await screen.findByText(/item copied/i);
		expect(closeAction).toHaveBeenCalledTimes(1);
	});

	test('breadcrumb shows full path of opened folder and allows navigation to parent nodes', async () => {
		const currentFolder = populateFolder();
		const { path } = populateParents(currentFolder, 4, true);
		forEach(path, (mockedNode) => {
			mockedNode.permissions.can_write_file = true;
		});
		const file = populateFile();
		const folder = populateFolder();
		folder.parent = currentFolder;
		folder.permissions.can_write_file = true;
		currentFolder.children.nodes.push(file, folder);
		const nodesToCopy = [file];
		const ancestorIndex = 1;
		const ancestor = path[ancestorIndex] as Folder;
		ancestor.children.nodes = [path[ancestorIndex + 1]];
		const mocks = {
			Query: {
				getNode: mockGetNode(currentFolder, folder, ancestor),
				getPath: mockGetPath(
					path,
					path.concat(folder) as ArrayOneOrMore<Node>,
					path.slice(0, ancestorIndex + 1) as ArrayOneOrMore<Node>
				)
			}
		} satisfies Partial<Resolvers>;

		const { getByTextWithMarkup, findByTextWithMarkup, user } = setup(
			<div onClick={resetToDefault}>
				<CopyNodesModalContent folderId={currentFolder.id} nodesToCopy={nodesToCopy} />
			</div>,
			{ mocks }
		);

		await screen.findByText((currentFolder.children.nodes[0] as Node).name);
		let breadcrumbRegexp = buildBreadCrumbRegExp('Files', ...map(path, (node) => node.name));
		await waitFor(() =>
			expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument()
		);
		await findByTextWithMarkup(breadcrumbRegexp);
		// full path immediately visible
		expect(getByTextWithMarkup(breadcrumbRegexp)).toBeVisible();
		// navigate to sub-folder
		await user.dblClick(screen.getByText(folder.name));
		breadcrumbRegexp = buildBreadCrumbRegExp(
			'Files',
			...map([...path, folder], (node) => node.name)
		);
		await findByTextWithMarkup(breadcrumbRegexp);
		expect(getByTextWithMarkup(breadcrumbRegexp)).toBeVisible();
		// navigate to ancestor
		await user.click(screen.getByText(ancestor.name));
		// wait children to be loaded
		breadcrumbRegexp = buildBreadCrumbRegExp(
			'Files',
			...map(path.slice(0, ancestorIndex + 1), (node) => node.name)
		);
		await findByTextWithMarkup(breadcrumbRegexp);
		expect(getByTextWithMarkup(breadcrumbRegexp)).toBeVisible();
		expect(screen.queryByText(currentFolder.name, { exact: false })).not.toBeInTheDocument();
	});

	test('scroll trigger pagination', async () => {
		const currentFolder = populateFolder(NODES_LOAD_LIMIT * 2 - 1);
		const nodesToCopy = [currentFolder.children.nodes[0] as File | Folder];

		const mocks = {
			Query: {
				getNode: mockGetNode(currentFolder),
				getPath: mockGetPath([currentFolder])
			}
		} satisfies Partial<Resolvers>;

		const { findByTextWithMarkup } = setup(
			<div onClick={resetToDefault}>
				<CopyNodesModalContent folderId={currentFolder.id} nodesToCopy={nodesToCopy} />
			</div>,
			{
				mocks
			}
		);

		await screen.findByText((currentFolder.children.nodes[0] as File | Folder).name);
		const modalListHeader = screen.getByTestId(SELECTORS.modalListHeader);
		await waitFor(() =>
			expect(
				within(modalListHeader).queryByTestId(ICON_REGEXP.queryLoading)
			).not.toBeInTheDocument()
		);
		await findByTextWithMarkup(buildBreadCrumbRegExp('Files', currentFolder.name));
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
