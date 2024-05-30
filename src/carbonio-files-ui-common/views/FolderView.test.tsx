/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { find, map } from 'lodash';

import FolderView from './FolderView';
import { ACTION_IDS } from '../../constants';
import * as actualNetworkModule from '../../network/network';
import { DISPLAYER_EMPTY_MESSAGE, ICON_REGEXP, SELECTORS } from '../constants/test';
import {
	populateFile,
	populateFolder,
	populateGalContact,
	populateLocalRoot,
	populateNode,
	populateNodePage,
	populateParents,
	populateShare,
	populateUser
} from '../mocks/mockUtils';
import {
	buildBreadCrumbRegExp,
	moveNode,
	screen,
	setup,
	spyOnUseCreateOptions,
	within
} from '../tests/utils';
import { Node } from '../types/common';
import { Resolvers } from '../types/graphql/resolvers-types';
import { Folder, Share, SharePermission } from '../types/graphql/types';
import {
	mockCreateShare,
	mockDeleteShare,
	mockGetAccountByEmail,
	mockGetCollaborationLinks,
	mockGetLinks,
	mockGetNode,
	mockGetPath,
	mockMoveNodes,
	mockUpdateShare
} from '../utils/resolverMocks';

const mockedSoapFetch = jest.fn();

jest.mock<typeof import('../../network/network')>('../../network/network', () => ({
	soapFetch: <Req, Res extends Record<string, unknown>>(): ReturnType<
		typeof actualNetworkModule.soapFetch<Req, Res>
	> =>
		new Promise<Res>((resolve, reject) => {
			const result = mockedSoapFetch();
			result ? resolve(result) : reject(new Error('no result provided'));
		})
}));

describe('Folder View', () => {
	describe('Create Folder', () => {
		test('Create folder option is disabled if current folder has not can_write_folder permission', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_folder = false;
			currentFolder.permissions.can_write_file = false;
			const createOptions = spyOnUseCreateOptions();
			const mocks = {
				Query: {
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] }),
					getPath: mockGetPath([currentFolder])
				}
			} satisfies Partial<Resolvers>;
			const { findByTextWithMarkup } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});
			await screen.findByText(/nothing here/i);
			await findByTextWithMarkup(buildBreadCrumbRegExp(currentFolder.name));
			expect(createOptions.map((createOption) => createOption.action({}))).toContainEqual(
				expect.objectContaining({ id: ACTION_IDS.CREATE_FOLDER, disabled: true })
			);
		});

		test('Create folder option is active if current folder has can_write_folder permission', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_folder = true;
			const createOptions = spyOnUseCreateOptions();
			const mocks = {
				Query: {
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] }),
					getPath: mockGetPath([currentFolder])
				}
			} satisfies Partial<Resolvers>;

			setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});
			await screen.findByText(/nothing here/i);
			expect(createOptions.map((createOption) => createOption.action({}))).toContainEqual(
				expect.objectContaining({ id: ACTION_IDS.CREATE_FOLDER, disabled: false })
			);
		});
	});

	describe('Displayer', () => {
		test('Single click on a node opens the details tab on displayer', async () => {
			const currentFolder = populateFolder(2);
			const mocks = {
				Query: {
					getNode: mockGetNode({
						getChildren: [currentFolder],
						getPermissions: [currentFolder],
						getNode: [currentFolder.children.nodes[0] as Node]
					}),
					getPath: mockGetPath([currentFolder])
				}
			} satisfies Partial<Resolvers>;
			const { getByTextWithMarkup, user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});
			const nodeItem = await screen.findByText((currentFolder.children.nodes[0] as Node).name);
			expect(nodeItem).toBeVisible();
			const displayer = screen.getByTestId(SELECTORS.displayer);
			expect(within(displayer).queryByText(/details/i)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(
				within(displayer).getAllByText((currentFolder.children.nodes[0] as Node).name)
			).toHaveLength(2);
			expect(
				getByTextWithMarkup(buildBreadCrumbRegExp((currentFolder.children.nodes[0] as Node).name))
			).toBeVisible();
		});

		test('Move action close the displayer if node is removed from the main list', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_folder = true;
			currentFolder.permissions.can_write_file = true;
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			currentFolder.children.nodes.push(destinationFolder);
			const { path: parentPath } = populateParents(currentFolder);
			const node = populateNode();
			node.parent = currentFolder;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			currentFolder.children.nodes.push(node);
			const path = [...parentPath, node];

			const mocks = {
				Query: {
					getNode: mockGetNode({
						getChildren: [currentFolder],
						getPermissions: [currentFolder],
						getNode: [node]
					}),
					getPath: mockGetPath(path, parentPath)
				},
				Mutation: {
					moveNodes: mockMoveNodes([{ ...node, parent: destinationFolder }])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}&node=${node.id}`],
				mocks
			});
			const displayer = await screen.findByTestId(SELECTORS.displayer);
			await screen.findAllByText(node.name);
			await screen.findByText(destinationFolder.name);
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			// right click to open contextual menu
			const nodeToMoveItem = within(screen.getByTestId(SELECTORS.list(currentFolder.id))).getByText(
				node.name
			);
			fireEvent.contextMenu(nodeToMoveItem);
			await moveNode(destinationFolder, user);
			await screen.findByText(/item moved/i);
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			expect(screen.queryByTestId(SELECTORS.nodeItem(node.id))).not.toBeInTheDocument();
			expect(screen.queryAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
				currentFolder.children.nodes.length - 1
			);
			expect(screen.queryByText(/details/i)).not.toBeInTheDocument();
			expect(within(displayer).queryByText(node.name)).not.toBeInTheDocument();
			expect(screen.getByText(DISPLAYER_EMPTY_MESSAGE)).toBeVisible();
		});
	});

	describe('Create docs files', () => {
		test('Create file options are disabled if current folder has not can_write_file permission', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_file = false;
			const createOptions = spyOnUseCreateOptions();
			const mocks = {
				Query: {
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] }),
					getPath: mockGetPath([currentFolder])
				}
			} satisfies Partial<Resolvers>;
			setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});
			await screen.findByText(/nothing here/i);
			expect(createOptions.map((createOption) => createOption.action({}))).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_DOCUMENT, disabled: true }),
					expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_SPREADSHEET, disabled: true }),
					expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_PRESENTATION, disabled: true })
				])
			);
		});

		test('Create docs files options are active if current folder has can_write_file permission', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_file = true;
			const createOptions = spyOnUseCreateOptions();
			const mocks = {
				Query: {
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] }),
					getPath: mockGetPath([currentFolder])
				}
			} satisfies Partial<Resolvers>;
			setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});
			await screen.findByText(/nothing here/i);
			expect(createOptions.map((createOption) => createOption.action({}))).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_DOCUMENT, disabled: false }),
					expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_SPREADSHEET, disabled: false }),
					expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_PRESENTATION, disabled: false })
				])
			);
		});
	});

	test('should show the list of valid nodes even if the children include some invalid node', async () => {
		const folder = populateFolder(2);
		const node = populateNode();
		folder.children.nodes.push(null, node);
		const mocks = {
			Query: {
				getNode: mockGetNode({ getChildren: [folder], getPermissions: [folder] }),
				getPath: mockGetPath([folder])
			}
		} satisfies Partial<Resolvers>;
		setup(<FolderView />, { initialRouterEntries: [`/?folder=${folder.id}`], mocks });
		await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
		await screen.findByText(node.name);
		expect(screen.getByText(node.name)).toBeVisible();
	});

	describe('propagation of shares changes', () => {
		function findChipWithText(text: string | RegExp): HTMLElement | undefined {
			return find(
				screen.queryAllByTestId(SELECTORS.chipWithPopover),
				(chip) => within(chip).queryByText(text) !== null
			);
		}
		test('should show the new share in cached children', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			const subFolder = populateFolder();
			const subSubFile = populateFile();
			localRoot.children = populateNodePage([folder]);
			folder.children = populateNodePage([subFolder]);
			subFolder.children = populateNodePage([subSubFile]);
			folder.parent = localRoot;
			folder.permissions.can_share = true;
			folder.shares = [];
			subFolder.parent = folder;
			subFolder.permissions.can_share = true;
			subFolder.shares = [];
			subSubFile.parent = subFolder;
			subSubFile.permissions.can_share = true;
			subSubFile.shares = [];
			const userAccount = populateUser();
			// set email to lowercase to be compatible with the contact regexp
			userAccount.email = userAccount.email.toLowerCase();
			const newShare = populateShare(folder, 'new-share', userAccount);
			function addShareToChildren(node: Folder, share: Share): Folder {
				return {
					...node,
					children: populateNodePage(
						map(
							node.children.nodes,
							(child) =>
								child && {
									...child,
									shares: [...(child?.shares || []), { ...share, child }]
								}
						)
					)
				};
			}

			const folderWithShares = { ...addShareToChildren(folder, newShare), shares: [newShare] };
			const subFolderWithShares = {
				...addShareToChildren(subFolder, newShare),
				shares: [{ ...newShare, node: subFolder }]
			};

			const mocks = {
				Query: {
					getNode: mockGetNode({
						getChildren: [localRoot],
						getPermissions: [localRoot],
						getNode: [folder, subFolder, subSubFile, folderWithShares, subFolderWithShares]
					}),
					getPath: mockGetPath([localRoot], [localRoot, folder], [localRoot, folder, subFolder]),
					getAccountByEmail: mockGetAccountByEmail(userAccount),
					getCollaborationLinks: mockGetCollaborationLinks([], [], []),
					getLinks: mockGetLinks([], [], [])
				},
				Mutation: {
					createShare: mockCreateShare(newShare)
				}
			} satisfies Partial<Resolvers>;

			mockedSoapFetch.mockReturnValue({
				match: [populateGalContact(userAccount.full_name, userAccount.email)]
			});

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${localRoot.id}&node=${folder.id}`],
				mocks
			});
			await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
			// folder is not shared
			const folderItem = screen.getByTestId(SELECTORS.nodeItem(folder.id));
			expect(within(folderItem).queryByTestId(ICON_REGEXP.sharedByMe)).not.toBeInTheDocument();
			// navigate inside folder to cache data
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(localRoot.id))).getByText(folder.name)
			);
			await screen.findByText(subFolder.name);
			// sub-folder is not shared
			const subFolderItem = screen.getByTestId(SELECTORS.nodeItem(subFolder.id));
			expect(within(subFolderItem).queryByTestId(ICON_REGEXP.sharedByMe)).not.toBeInTheDocument();
			await user.click(screen.getByText(subFolder.name));
			await screen.findByText(/sharing/i);
			// load shares
			await user.click(screen.getByText(/sharing/i));
			// navigate inside sub-folder to cache data
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(folder.id))).getByText(subFolder.name)
			);
			await screen.findByText(subSubFile.name);
			// sub-sub-file is not shared
			const subSubFileItem = screen.getByTestId(SELECTORS.nodeItem(subSubFile.id));
			expect(within(subSubFileItem).queryByTestId(ICON_REGEXP.sharedByMe)).not.toBeInTheDocument();
			await user.click(screen.getByText(subSubFile.name));
			await screen.findByText(/sharing/i);
			// load shares
			await user.click(screen.getByText(/sharing/i));
			// navigate back to local root
			await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCtaExpand));
			await screen.findByText(localRoot.name);
			await user.click(screen.getByText(localRoot.name));
			// create share on parent folder
			await screen.findByText(folder.name);
			await user.click(screen.getByText(folder.name));
			await screen.findByText(/sharing/i);
			await user.click(screen.getByText(/sharing/i));
			const shareButton = await screen.findByRole('button', { name: /share/i });
			await user.type(
				screen.getByRole('textbox', { name: /add new people or groups/i }),
				userAccount.full_name[0]
			);
			await screen.findByText(userAccount.full_name);
			await user.click(screen.getByText(userAccount.full_name));
			const addShareChipInput = screen.getByTestId(SELECTORS.addShareChipInput);
			await within(addShareChipInput).findByText(userAccount.full_name);
			await waitFor(() => expect(shareButton).toBeEnabled());
			await user.click(shareButton);
			expect(within(addShareChipInput).queryByText(userAccount.full_name)).not.toBeInTheDocument();
			await waitFor(() => expect(findChipWithText(userAccount.full_name)).toBeDefined());
			expect(findChipWithText(userAccount.full_name)).toBeVisible();
			// folder is shared
			expect(
				within(screen.getByTestId(SELECTORS.nodeItem(folder.id))).getByTestId(
					ICON_REGEXP.sharedByMe
				)
			).toBeVisible();
			act(() => {
				jest.runOnlyPendingTimers();
			});
			// navigate inside folder
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(localRoot.id))).getByText(folder.name)
			);
			await screen.findByText(subFolder.name);
			// sub-folder is shared
			expect(
				within(screen.getByTestId(SELECTORS.nodeItem(subFolder.id))).getByTestId(
					ICON_REGEXP.sharedByMe
				)
			).toBeVisible();
			await user.click(screen.getByText(subFolder.name));
			await screen.findByText(/sharing/i);
			await user.click(screen.getByText(/sharing/i));
			expect(findChipWithText(userAccount.full_name)).toBeVisible();
			// navigate inside sub-folder
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(folder.id))).getByText(subFolder.name)
			);
			await screen.findByText(subSubFile.name);
			// sub-sub-file is shared
			expect(
				within(screen.getByTestId(SELECTORS.nodeItem(subSubFile.id))).getByTestId(
					ICON_REGEXP.sharedByMe
				)
			).toBeVisible();
			await user.click(screen.getByText(subSubFile.name));
			await screen.findByText(/sharing/i);
			await user.click(screen.getByText(/sharing/i));
			expect(findChipWithText(userAccount.full_name)).toBeVisible();
		});

		test('should show the updated share in cached children', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			const subFolder = populateFolder();
			const subSubFile = populateFile();
			localRoot.children = populateNodePage([folder]);
			folder.children = populateNodePage([subFolder]);
			subFolder.children = populateNodePage([subSubFile]);
			folder.parent = localRoot;
			folder.permissions.can_write_folder = true;
			folder.permissions.can_write_file = true;
			folder.permissions.can_share = true;
			subFolder.parent = folder;
			subFolder.permissions.can_write_folder = true;
			subFolder.permissions.can_write_file = true;
			subFolder.permissions.can_share = true;
			subSubFile.parent = subFolder;
			subSubFile.permissions.can_write_folder = true;
			subSubFile.permissions.can_write_file = true;
			subSubFile.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(folder, 'share-to-update', userAccount);
			share.permission = SharePermission.ReadOnly;
			folder.shares = [{ ...share, node: folder }];
			subFolder.shares = [{ ...share, node: subFolder }];
			subSubFile.shares = [{ ...share, node: subSubFile }];

			const shareUpdated = {
				...share,
				permission: SharePermission.ReadAndWrite
			};

			function updateShareInChildren(node: Folder, newShare: Share): Folder {
				return {
					...node,
					children: populateNodePage(
						map(
							node.children.nodes,
							(child) =>
								child && {
									...child,
									shares: [{ ...newShare, node: child }]
								}
						)
					)
				};
			}

			const folderUpdated = updateShareInChildren(folder, shareUpdated);
			folderUpdated.shares = [{ ...shareUpdated, node: folderUpdated }];
			const subFolderUpdated = updateShareInChildren(subFolder, shareUpdated);
			subFolderUpdated.shares = [{ ...shareUpdated, node: subFolderUpdated }];

			const mocks = {
				Query: {
					getNode: mockGetNode({
						getChildren: [localRoot],
						getPermissions: [localRoot],
						getNode: [folder, subFolder, subSubFile, folderUpdated, subFolderUpdated]
					}),
					getPath: mockGetPath([localRoot], [localRoot, folder], [localRoot, folder, subFolder]),
					getCollaborationLinks: mockGetCollaborationLinks([], [], []),
					getLinks: mockGetLinks([], [], [])
				},
				Mutation: {
					updateShare: mockUpdateShare({ ...shareUpdated, node: folderUpdated })
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${localRoot.id}&node=${folder.id}`],
				mocks
			});
			await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
			// folder share is read-only
			await screen.findByText(/sharing/i);
			await user.click(screen.getByText(/sharing/i));
			expect(
				within(findChipWithText(userAccount.full_name) as HTMLElement).getByRoleWithIcon('button', {
					icon: ICON_REGEXP.shareCanRead
				})
			).toBeVisible();
			act(() => {
				jest.runOnlyPendingTimers();
			});
			// navigate inside folder to cache data
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(localRoot.id))).getByText(folder.name)
			);
			await screen.findByText(subFolder.name);
			await user.click(screen.getByText(subFolder.name));
			// sub-folder share is read-only
			await screen.findByText(/sharing/i);
			await user.click(screen.getByText(/sharing/i));
			expect(
				within(findChipWithText(userAccount.full_name) as HTMLElement).getByRoleWithIcon('button', {
					icon: ICON_REGEXP.shareCanRead
				})
			).toBeVisible();
			// navigate inside sub-folder to cache data
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(folder.id))).getByText(subFolder.name)
			);
			await screen.findByText(subSubFile.name);
			await user.click(screen.getByText(subSubFile.name));
			// sub-sub-file share is read-only
			await screen.findByText(/sharing/i);
			await user.click(screen.getByText(/sharing/i));
			expect(
				within(findChipWithText(userAccount.full_name) as HTMLElement).getByRoleWithIcon('button', {
					icon: ICON_REGEXP.shareCanRead
				})
			).toBeVisible();
			// navigate back to local root
			await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCtaExpand));
			await screen.findByText(localRoot.name);
			await user.click(screen.getByText(localRoot.name));
			// edit share on parent folder
			await screen.findByText(folder.name);
			await user.click(screen.getByText(folder.name));
			await screen.findByText(/sharing/i);
			await user.click(screen.getByText(/sharing/i));
			await user.click(
				within(findChipWithText(userAccount.full_name) as HTMLElement).getByRoleWithIcon('button', {
					icon: ICON_REGEXP.shareCanRead
				})
			);
			const shareAsEditor = await screen.findByText(/editor/i);
			const saveButton = screen.getByRole('button', { name: /save/i });
			await user.click(shareAsEditor);
			await waitFor(() => expect(saveButton).toBeEnabled());
			await user.click(saveButton);
			// folder share is updated
			expect(
				within(findChipWithText(userAccount.full_name) as HTMLElement).getByRoleWithIcon('button', {
					icon: ICON_REGEXP.shareCanWrite
				})
			).toBeVisible();
			// navigate inside folder
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(localRoot.id))).getByText(folder.name)
			);
			await screen.findByText(subFolder.name);
			await user.click(screen.getByText(subFolder.name));
			await screen.findByText(/sharing/i);
			await user.click(screen.getByText(/sharing/i));
			// sub-folder share is updated
			await waitFor(() => expect(findChipWithText(userAccount.full_name)).toBeDefined());
			expect(
				within(findChipWithText(userAccount.full_name) as HTMLElement).getByRoleWithIcon('button', {
					icon: ICON_REGEXP.shareCanWrite
				})
			).toBeVisible();
			// navigate inside sub-folder
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(folder.id))).getByText(subFolder.name)
			);
			await screen.findByText(subSubFile.name);
			await user.click(screen.getByText(subSubFile.name));
			await screen.findByText(/sharing/i);
			await user.click(screen.getByText(/sharing/i));
			// sub-sub-file share is updated
			expect(
				within(findChipWithText(userAccount.full_name) as HTMLElement).getByRoleWithIcon('button', {
					icon: ICON_REGEXP.shareCanWrite
				})
			).toBeVisible();
		});

		test('should not show the deleted share in cached children', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder(0, 'folder');
			const subFolder = populateFolder(0, 'subFolder');
			const subSubFile = populateFile('subSubFile');
			localRoot.children = populateNodePage([folder]);
			folder.children = populateNodePage([subFolder]);
			subFolder.children = populateNodePage([subSubFile]);
			folder.parent = localRoot;
			folder.permissions.can_write_folder = true;
			folder.permissions.can_write_file = true;
			folder.permissions.can_share = true;
			subFolder.parent = folder;
			subFolder.permissions.can_write_folder = true;
			subFolder.permissions.can_write_file = true;
			subFolder.permissions.can_share = true;
			subSubFile.parent = subFolder;
			subSubFile.permissions.can_write_folder = true;
			subSubFile.permissions.can_write_file = true;
			subSubFile.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(folder, 'share-to-update', userAccount);
			share.permission = SharePermission.ReadOnly;
			folder.shares = [{ ...share, node: folder }];
			subFolder.shares = [{ ...share, node: subFolder }];
			subSubFile.shares = [{ ...share, node: subSubFile }];

			function removeShareInChildren(node: Folder): Folder {
				return {
					...node,
					children: populateNodePage(
						map(
							node.children.nodes,
							(child) =>
								child && {
									...child,
									shares: []
								}
						)
					)
				};
			}

			const folderUpdated = removeShareInChildren(folder);
			folderUpdated.shares = [];
			const subFolderUpdated = removeShareInChildren(subFolder);
			subFolderUpdated.shares = [];

			const mocks = {
				Query: {
					getNode: mockGetNode({
						getChildren: [localRoot, folderUpdated],
						getPermissions: [localRoot],
						getNode: [folder, subFolder, subSubFile, subFolderUpdated]
					}),
					getPath: mockGetPath([localRoot], [localRoot, folder], [localRoot, folder, subFolder]),
					getCollaborationLinks: mockGetCollaborationLinks([], [], []),
					getLinks: mockGetLinks([], [], [])
				},
				Mutation: {
					deleteShare: mockDeleteShare(true)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${localRoot.id}&node=${folder.id}`],
				mocks
			});
			await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
			// folder has share
			await user.click(await screen.findByText(/sharing/i));
			expect(findChipWithText(userAccount.full_name)).toBeVisible();
			act(() => {
				jest.runOnlyPendingTimers();
			});
			// navigate inside folder to cache data
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(localRoot.id))).getByText(folder.name)
			);
			await user.click(await screen.findByText(subFolder.name));
			// sub-folder has share
			await user.click(await screen.findByText(/sharing/i));
			expect(findChipWithText(userAccount.full_name)).toBeVisible();
			// navigate inside sub-folder to cache data
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(folder.id))).getByText(subFolder.name)
			);
			await user.click(await screen.findByText(subSubFile.name));
			// sub-sub-file has share
			await user.click(await screen.findByText(/sharing/i));
			expect(findChipWithText(userAccount.full_name)).toBeVisible();
			// navigate back to local root
			await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCtaExpand));
			await user.click(await screen.findByText(localRoot.name));
			// remove share on parent folder
			await user.click(await screen.findByText(folder.name));
			await user.click(await screen.findByText(/sharing/i));
			await user.click(
				within(findChipWithText(userAccount.full_name) as HTMLElement).getByRoleWithIcon('button', {
					icon: ICON_REGEXP.close
				})
			);
			await user.click(await screen.findByRole('button', { name: /remove/i }));
			// folder share is removed
			expect(screen.queryByText(userAccount.full_name)).not.toBeInTheDocument();
			// navigate inside folder
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(localRoot.id))).getByText(folder.name)
			);
			await user.click(await screen.findByText(subFolder.name));
			await user.click(await screen.findByText(/sharing/i));
			// sub-folder share has been removed
			expect(screen.queryByText(userAccount.full_name)).not.toBeInTheDocument();
			// navigate inside sub-folder
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(folder.id))).getByText(subFolder.name)
			);
			await user.click(await screen.findByText(subSubFile.name));
			await user.click(await screen.findByText(/sharing/i));
			// sub-sub-file share has been removed
			expect(screen.queryByText(userAccount.full_name)).not.toBeInTheDocument();
		});
	});
});
