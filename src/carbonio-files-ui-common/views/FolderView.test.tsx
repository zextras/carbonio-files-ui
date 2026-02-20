/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, waitFor } from '@testing-library/react';
import { RawSoapResponse } from '@zextras/carbonio-ui-soap-lib';
import { map } from 'lodash';

import FolderView from './FolderView';
import { ACTION_IDS } from '../../constants';
import * as network from '../../network/network';
import { viewModeVar } from '../apollo/viewModeVar';
import { VIEW_MODE } from '../constants';
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
import { Resolvers } from '../types/graphql/resolvers-types';
import { Folder, Share, SharePermission } from '../types/graphql/types';
import { AutocompleteResponse } from '../types/network';
import {
	mockCreateShare,
	mockDeleteShares,
	mockGetAccountByEmail,
	mockGetCollaborationLinks,
	mockGetLinks,
	mockGetNode,
	mockGetPath,
	mockMoveNodes,
	mockUpdateShares
} from '../utils/resolverMocks';

vi.mock('./components/VirtualizedNodeListItem');
vi.mock('./components/NodeHoverBar');

describe('Folder View', () => {
	describe('Create Folder', () => {
		it('should open the modal if the user wants to create a folder on right click', async () => {
			const currentFolder = populateFolder();
			currentFolder.permissions.can_write_folder = true;
			const mocks = {
				Query: {
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await screen.findByText(/nothing here/i);
			await user.rightClick(screen.getByTestId('emptyFolder'));
			await user.click(screen.getByText(/new folder/i));
			act(() => {
				// run timers of modal
				vi.advanceTimersToNextTimer();
			});
			const modal = await screen.findByTestId('modal');
			expect(within(modal).getByText(/create new folder/i)).toBeVisible();
		});

		test('Create folder option is hidden if current folder has not can_write_folder permission', async () => {
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

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await screen.findByText(/nothing here/i);
			await findByTextWithMarkup(buildBreadCrumbRegExp(currentFolder.name));
			expect(createOptions.map((createOption) => createOption.action({}))).not.toContainEqual(
				expect.objectContaining({ id: ACTION_IDS.CREATE_FOLDER })
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

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await screen.findByText(/nothing here/i);
			expect(createOptions.map((createOption) => createOption.action({}))).toContainEqual(
				expect.objectContaining({ id: ACTION_IDS.CREATE_FOLDER })
			);
		});
	});

	describe('Displayer', () => {
		it('should not show displayer in grid mode if there is no active node', async () => {
			viewModeVar(VIEW_MODE.grid);
			const currentFolder = populateFolder(2);
			const mocks = {
				Query: {
					getNode: mockGetNode({
						getChildren: [currentFolder],
						getPermissions: [currentFolder]
					}),
					getPath: mockGetPath([currentFolder])
				}
			} satisfies Partial<Resolvers>;
			setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(screen.queryByTestId(SELECTORS.displayer)).not.toBeInTheDocument();
		});

		it('should show displayer details in grid mode when click on a node', async () => {
			viewModeVar(VIEW_MODE.grid);
			const currentFolder = populateFolder(2);
			const mocks = {
				Query: {
					getNode: mockGetNode({
						getChildren: [currentFolder],
						getPermissions: [currentFolder],
						getNode: [currentFolder.children.nodes[0]!]
					}),
					getPath: mockGetPath([currentFolder])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await user.click(screen.getByText(currentFolder.children.nodes[0]!.name));
			expect(
				within(await screen.findByTestId(SELECTORS.displayer)).getByText(/details/i)
			).toBeVisible();
		});

		it('should hide the displayer in grid mode when closed', async () => {
			viewModeVar(VIEW_MODE.grid);
			const currentFolder = populateFolder(2);
			const mocks = {
				Query: {
					getNode: mockGetNode({
						getChildren: [currentFolder],
						getPermissions: [currentFolder],
						getNode: [currentFolder.children.nodes[0]!]
					}),
					getPath: mockGetPath([currentFolder])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<FolderView />, {
				initialRouterEntries: [
					`/?folder=${currentFolder.id}&node=${currentFolder.children.nodes[0]!.id}`
				],
				mocks
			});
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await user.click(
				within(screen.getByTestId(SELECTORS.displayer)).getByRoleWithIcon('button', {
					icon: ICON_REGEXP.close
				})
			);
			expect(screen.queryByTestId(SELECTORS.displayer)).not.toBeInTheDocument();
		});

		test('Single click on a node opens the details tab on displayer', async () => {
			const currentFolder = populateFolder(2);
			const mocks = {
				Query: {
					getNode: mockGetNode({
						getChildren: [currentFolder],
						getPermissions: [currentFolder],
						getNode: [currentFolder.children.nodes[0]!]
					}),
					getPath: mockGetPath([currentFolder])
				}
			} satisfies Partial<Resolvers>;
			const { getByTextWithMarkup, user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			const nodeItem = await screen.findByText(currentFolder.children.nodes[0]!.name);
			expect(nodeItem).toBeVisible();
			const displayer = screen.getByTestId(SELECTORS.displayer);
			expect(within(displayer).queryByText(/details/i)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(within(displayer).getAllByText(currentFolder.children.nodes[0]!.name)).toHaveLength(2);
			expect(
				getByTextWithMarkup(buildBreadCrumbRegExp(currentFolder.children.nodes[0]!.name))
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

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await screen.findAllByText(node.name);
			await screen.findByText(destinationFolder.name);
			const displayer = screen.getByTestId(SELECTORS.displayer);
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			// right click to open contextual menu
			const nodeToMoveItem = within(screen.getByTestId(SELECTORS.list(currentFolder.id))).getByText(
				node.name
			);
			await user.rightClick(nodeToMoveItem);
			await moveNode(destinationFolder, user);
			await screen.findByText(/item moved/i);
			expect(await screen.findByText(DISPLAYER_EMPTY_MESSAGE)).toBeVisible();
			expect(screen.queryByText(node.name)).not.toBeInTheDocument();
			expect(screen.queryByText(/details/i)).not.toBeInTheDocument();
		});
	});

	describe('Create docs files', () => {
		test('Create file options are hidden if current folder has not can_write_file permission', async () => {
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

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await screen.findByText(/nothing here/i);
			expect(createOptions.map((createOption) => createOption.action({}))).not.toContainEqual(
				expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_DOCUMENT })
			);
			expect(createOptions.map((createOption) => createOption.action({}))).not.toContainEqual(
				expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_SPREADSHEET })
			);
			expect(createOptions.map((createOption) => createOption.action({}))).not.toContainEqual(
				expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_PRESENTATION })
			);
		});

		test('Create docs files options are enabled if current folder has can_write_file permission', async () => {
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

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await screen.findByText(/nothing here/i);
			expect(createOptions.map((createOption) => createOption.action({}))).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_DOCUMENT }),
					expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_SPREADSHEET }),
					expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_PRESENTATION })
				])
			);
		});
	});

	test('should show the list of valid nodes even if the children include some invalid node', async () => {
		const folder = populateFolder(2);
		const node = populateFile();
		folder.children.nodes.push(null, node);
		const mocks = {
			Query: {
				getNode: mockGetNode({ getChildren: [folder], getPermissions: [folder] }),
				getPath: mockGetPath([folder])
			}
		} satisfies Partial<Resolvers>;
		setup(<FolderView />, { initialRouterEntries: [`/?folder=${folder.id}`], mocks });

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		await waitFor(() => {
			expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument();
		});
		await screen.findByText(node.name);
		expect(screen.getByText(node.name)).toBeVisible();
	});

	describe.skip('propagation of shares changes', () => {
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

			vi.spyOn(network, 'soapFetch').mockImplementation(
				(): Promise<RawSoapResponse<{ AutoCompleteResponse: AutocompleteResponse }>> =>
					Promise.resolve({
						Body: {
							AutoCompleteResponse: {
								match: [populateGalContact(userAccount.full_name, userAccount.email)]
							}
						},
						Header: { context: {} }
					})
			);

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${localRoot.id}&node=${folder.id}`],
				mocks
			});
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
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
			await screen.findByText(userAccount.full_name);
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			// folder is shared
			expect(
				within(screen.getByTestId(SELECTORS.nodeItem(folder.id))).getByTestId(
					ICON_REGEXP.sharedByMe
				)
			).toBeVisible();
			act(() => {
				vi.runOnlyPendingTimers();
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
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
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
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
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
					updateShares: mockUpdateShares({ ...shareUpdated, node: folderUpdated })
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${localRoot.id}&node=${folder.id}`],
				mocks
			});

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			// folder share is read-only
			await screen.findByText(/sharing/i);
			await user.click(screen.getByText(/sharing/i));
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			expect(
				screen.getByRoleWithIcon('button', {
					icon: ICON_REGEXP.shareCanRead
				})
			).toBeVisible();
			act(() => {
				vi.runOnlyPendingTimers();
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
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			expect(
				screen.getByRoleWithIcon('button', {
					icon: ICON_REGEXP.shareCanRead
				})
			).toBeVisible();
			// navigate inside sub-folder to cache data
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(folder.id))).getByText(subFolder.name)
			);
			await user.click(
				within(await screen.findByTestId(SELECTORS.list(subFolder.id))).getByText(subSubFile.name)
			);
			// sub-sub-file share is read-only
			await screen.findByText(/sharing/i);
			await user.click(screen.getByText(/sharing/i));
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			expect(
				screen.getByRoleWithIcon('button', {
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
				screen.getByRoleWithIcon('button', {
					icon: ICON_REGEXP.shareCanRead
				})
			);
			const shareAsEditor = await screen.findByText(/editor/i);
			const saveButton = screen.getByRole('button', { name: /save/i });
			await user.click(shareAsEditor);
			await waitFor(() => expect(saveButton).toBeEnabled());
			await user.click(saveButton);
			// folder share is updated
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			expect(
				screen.getByRoleWithIcon('button', {
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
			await screen.findByText(userAccount.full_name);
			expect(
				screen.getByRoleWithIcon('button', {
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
				screen.getByRoleWithIcon('button', {
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
					deleteShares: mockDeleteShares(['deleted-id'])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${localRoot.id}&node=${folder.id}`],
				mocks
			});

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			// folder has share
			await user.click(await screen.findByText(/sharing/i));
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			act(() => {
				vi.runOnlyPendingTimers();
			});
			// navigate inside folder to cache data
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(localRoot.id))).getByText(folder.name)
			);
			await user.click(await screen.findByText(subFolder.name));
			// sub-folder has share
			await user.click(await screen.findByText(/sharing/i));
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			// navigate inside sub-folder to cache data
			await user.dblClick(
				within(screen.getByTestId(SELECTORS.list(folder.id))).getByText(subFolder.name)
			);
			await user.click(await screen.findByText(subSubFile.name));
			// sub-sub-file has share
			await user.click(await screen.findByText(/sharing/i));
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			// navigate back to local root
			await user.click(screen.getByTestId(ICON_REGEXP.breadcrumbCtaExpand));
			await user.click(await screen.findByText(localRoot.name));
			// remove share on parent folder
			await user.click(await screen.findByText(folder.name));
			await user.click(await screen.findByText(/sharing/i));
			await user.click(
				screen.getByRoleWithIcon('button', {
					icon: ICON_REGEXP.trash
				})
			);
			const modalConfirmButton = await screen.findByRole('button', { name: /remove/i });
			await user.click(modalConfirmButton);
			await screen.findByTestId(SELECTORS.snackbar);
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
