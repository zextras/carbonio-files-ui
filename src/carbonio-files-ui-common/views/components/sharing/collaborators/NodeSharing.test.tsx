/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act } from '@testing-library/react';
import { RawSoapResponse } from '@zextras/carbonio-ui-soap-lib';
import { forEach } from 'lodash';

import { NodeSharing } from './NodeSharing';
import { LOGGED_USER } from '../../../../../mocks/constants';
import * as network from '../../../../../network/network';
import { ICON_REGEXP, SELECTORS } from '../../../../constants/test';
import {
	populateGalContact,
	populateNode,
	populateShare,
	populateShares,
	populateUser
} from '../../../../mocks/mockUtils';
import { screen, setup, within } from '../../../../tests/utils';
import { Resolvers } from '../../../../types/graphql/resolvers-types';
import {
	GetNodeDocument,
	GetNodeQuery,
	GetNodeQueryVariables,
	SharePermission,
	User
} from '../../../../types/graphql/types';
import {
	getNodeVariables,
	mockCreateShare,
	mockDeleteShares,
	mockGetAccountByEmail,
	mockGetCollaborationLinks,
	mockGetLinks,
	mockGetNode
} from '../../../../utils/resolverMocks';
import { getChipLabel } from '../../../../utils/utils';

let mockedUserLogged: User;
const mockedSoapFetch = vi.fn();

beforeEach(() => {
	mockedUserLogged = populateUser(global.mockedUserLogged.id, global.mockedUserLogged.name);
	vi.spyOn(network, 'soapFetch').mockImplementation(
		(): Promise<RawSoapResponse<Record<string, unknown>>> =>
			new Promise<RawSoapResponse<Record<string, unknown>>>((resolve, reject) => {
				const result = mockedSoapFetch();
				result
					? resolve({ Body: result, Header: { context: {} } })
					: reject(new Error('no result provided'));
			})
	);
});

describe('Node Sharing', () => {
	it('should render the collaborators sharing section', async () => {
		const node = populateNode();
		node.shares = [];
		node.permissions.can_share = true;
		const mocks = {
			Query: {
				getNode: mockGetNode({ getShares: [node] }),
				getLinks: mockGetLinks(node.links),
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		setup(<NodeSharing node={node} />, { mocks });

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		expect(screen.getByText(/collaborators/i)).toBeVisible();
		expect(
			screen.getByRole('textbox', {
				name: /add new people or groups/i
			})
		).toBeVisible();
		expect(
			screen.getByRoleWithIcon('button', {
				icon: ICON_REGEXP.shareOff,
				name: /viewer/i
			})
		).toBeVisible();
	});

	it('should render the banner if the user does not have sharing permission', async () => {
		const node = populateNode();
		node.shares = [];
		node.permissions.can_share = false;
		const mocks = {
			Query: {
				getNode: mockGetNode({ getShares: [node] }),
				getLinks: mockGetLinks(node.links),
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		setup(<NodeSharing node={node} />, { mocks });

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		expect(screen.getByTestId(ICON_REGEXP.infoOutline)).toBeVisible();
		expect(screen.getByText(/You are not allowed to share this item./)).toBeVisible();
	});

	it('should not render the banner if the user does have sharing permission', async () => {
		const node = populateNode();
		node.shares = [];
		node.permissions.can_share = true;
		const mocks = {
			Query: {
				getNode: mockGetNode({ getShares: [node] }),
				getLinks: mockGetLinks(node.links),
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		setup(<NodeSharing node={node} />, { mocks });

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		expect(screen.queryByTestId(ICON_REGEXP.infoOutline)).not.toBeInTheDocument();
		expect(screen.queryByText(/You are not allowed to share this item./)).not.toBeInTheDocument();
	});

	it('should render the collaborators and the number of collaborators', async () => {
		const node = populateNode();
		node.shares = populateShares(node, 2, true);
		node.permissions.can_share = true;
		const mocks = {
			Query: {
				getNode: mockGetNode({ getShares: [node] }),
				getLinks: mockGetLinks(node.links),
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		setup(<NodeSharing node={node} />, { mocks });

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		expect(screen.getAllByTestId(SELECTORS.avatar)).toHaveLength(node.shares.length + 1);
		forEach(node.shares, (share) => {
			// avatar of the owner and avatar of the collaborators
			expect(screen.getByText(getChipLabel(share?.share_target))).toBeVisible();
			if (share?.share_target?.__typename === 'User') {
				expect(screen.getByText(share.share_target.email)).toBeVisible();
			}
		});
		expect(screen.getByText(`(${node.shares.length})`)).toBeVisible();
	});

	it('should render the text "You - Owner" if the owner is the logged user)', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const mocks = {
			Query: {
				getNode: mockGetNode({ getShares: [node] }),
				getLinks: mockGetLinks(node.links),
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		setup(<NodeSharing node={node} />, { mocks });

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		expect(screen.getByText(/You - Owner/i)).toBeVisible();
	});

	it('should render the text "name_of_the_owner - Owner" if the owner is the logged user)', async () => {
		const node = populateNode();
		node.owner = populateUser();
		const share = populateShare(node, node.id, populateUser(LOGGED_USER.id));
		node.shares = [share];
		node.permissions.can_share = true;
		const mocks = {
			Query: {
				getNode: mockGetNode({ getShares: [node] }),
				getLinks: mockGetLinks(node.links),
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		setup(<NodeSharing node={node} />, { mocks });

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		expect(screen.getByText(`${getChipLabel(node.owner)} - Owner`)).toBeVisible();
	});

	it('should render the text "You" without the text "Owner" if the owner is the logged user)', async () => {
		const node = populateNode();
		node.owner = populateUser();
		const share = populateShare(node, node.id, populateUser(LOGGED_USER.id));
		node.shares = [share];
		node.permissions.can_share = true;
		const mocks = {
			Query: {
				getNode: mockGetNode({ getShares: [node] }),
				getLinks: mockGetLinks(node.links),
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		setup(<NodeSharing node={node} />, { mocks });

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		expect(screen.getByText('You')).toBeVisible();
		expect(screen.queryByText('You - Owner')).not.toBeInTheDocument();
	});

	describe('Edit collaboration buttons and Remove collaboration button', () => {
		it('should render all the buttons disabled expect for the remove button of the logged user', async () => {
			const node = populateNode();
			node.owner = populateUser();
			const loggedUser = populateUser(LOGGED_USER.id);
			const user2 = populateUser();
			const share1 = populateShare(node, node.id, loggedUser);
			const share2 = populateShare(node, node.id, user2);
			share1.permission = SharePermission.ReadOnly;
			share2.permission = SharePermission.ReadOnly;
			node.shares = [share1, share2];
			node.permissions.can_share = false;
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				}
			} satisfies Partial<Resolvers>;
			setup(<NodeSharing node={node} />, { mocks });

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			const shareCanReadButtons = screen.getAllByRoleWithIcon('button', {
				icon: ICON_REGEXP.shareCanRead
			});
			expect(shareCanReadButtons[0]).toBeDisabled();
			expect(shareCanReadButtons[1]).toBeDisabled();
			const shareOffButtons = screen.getAllByRoleWithIcon('button', {
				icon: ICON_REGEXP.shareOff
			});
			expect(shareOffButtons[0]).toBeDisabled();
			expect(shareOffButtons[1]).toBeDisabled();
			const trashButtons = screen.getAllByRoleWithIcon('button', { icon: ICON_REGEXP.trash });
			expect(trashButtons[0]).toBeEnabled();
			expect(trashButtons[1]).toBeDisabled();
		});

		it('should render the all the tooltip for all the buttons (READ_ONLY/READ_AND_WRITE with can_permission = false)', async () => {
			const node = populateNode();
			node.owner = populateUser();
			const loggedUser = populateUser(LOGGED_USER.id);
			const user2 = populateUser();
			const share1 = populateShare(node, node.id, loggedUser);
			const share2 = populateShare(node, node.id, user2);
			share1.permission = SharePermission.ReadOnly;
			share2.permission = SharePermission.ReadOnly;
			node.shares = [share1, share2];
			node.permissions.can_share = false;
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<NodeSharing node={node} />, { mocks });

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			const shareCanReadButtons = screen.getAllByRoleWithIcon('button', {
				icon: ICON_REGEXP.shareCanRead
			});
			await user.hover(shareCanReadButtons[0]);
			expect(
				await screen.findByText(/You don't have the necessary permissions to edit collaboration/i)
			).toBeVisible();
			const shareOffButtons = screen.getAllByRoleWithIcon('button', {
				icon: ICON_REGEXP.shareOff
			});
			await user.hover(shareOffButtons[0]);
			expect(
				await screen.findByText(/You don't have the necessary permissions to edit collaboration/i)
			).toBeVisible();
			const trashButtons = screen.getAllByRoleWithIcon('button', { icon: ICON_REGEXP.trash });
			await user.hover(trashButtons[0]);
			expect(await screen.findByText(/Remove your collaboration/i)).toBeVisible();
			await user.hover(trashButtons[1]);
			expect(
				await screen.findByText(/You don't have the necessary permissions to remove collaboration/i)
			).toBeVisible();
		});

		it('should render the all the tooltip for all the buttons (READ_AND_SHARE with can_permission = true)', async () => {
			const node = populateNode();
			node.owner = populateUser();
			const loggedUser = populateUser(LOGGED_USER.id);
			const user2 = populateUser();
			const share1 = populateShare(node, node.id, loggedUser);
			const share2 = populateShare(node, node.id, user2);
			share1.permission = SharePermission.ReadAndShare;
			share2.permission = SharePermission.ReadAndShare;
			node.shares = [share1, share2];
			node.permissions.can_share = true;
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<NodeSharing node={node} />, { mocks });

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			const shareCanReadButtons = screen.getAllByRoleWithIcon('button', {
				icon: ICON_REGEXP.shareCanRead
			});
			await user.hover(shareCanReadButtons[0]);
			expect(await screen.findByText(/Edit your collaboration/i)).toBeVisible();
			await user.hover(shareCanReadButtons[1]);
			expect(await screen.findByText(/Edit collaboration/i)).toBeVisible();
			const shareCanShareButtons = screen.getAllByRoleWithIcon('button', {
				icon: ICON_REGEXP.shareCanShare
			});
			await user.hover(shareCanShareButtons[0]);
			expect(await screen.findByText(/Edit your collaboration/i)).toBeVisible();
			await user.hover(shareCanShareButtons[1]);
			expect(await screen.findByText(/Edit collaboration/i)).toBeVisible();
			const trashButtons = screen.getAllByRoleWithIcon('button', { icon: ICON_REGEXP.trash });
			await user.hover(trashButtons[0]);
			expect(await screen.findByText(/Remove your collaboration/i)).toBeVisible();
			await user.hover(trashButtons[1]);
			expect(await screen.findByText(/Remove collaboration/i)).toBeVisible();
		});

		it('should render the all the tooltip for all the buttons (READ_WRITE_AND_SHARE with can_permission = true)', async () => {
			const node = populateNode();
			node.owner = populateUser();
			const loggedUser = populateUser(LOGGED_USER.id);
			const user2 = populateUser();
			const share1 = populateShare(node, node.id, loggedUser);
			const share2 = populateShare(node, node.id, user2);
			share1.permission = SharePermission.ReadWriteAndShare;
			share2.permission = SharePermission.ReadWriteAndShare;
			node.shares = [share1, share2];
			node.permissions.can_share = true;
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<NodeSharing node={node} />, { mocks });

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			const editButtons = screen.getAllByRoleWithIcon('button', {
				icon: ICON_REGEXP.edit
			});
			await user.hover(editButtons[0]);
			expect(await screen.findByText(/Edit your collaboration/i)).toBeVisible();
			await user.hover(editButtons[1]);
			expect(await screen.findByText(/Edit collaboration/i)).toBeVisible();
			const shareCanShareButtons = screen.getAllByRoleWithIcon('button', {
				icon: ICON_REGEXP.shareCanShare
			});
			await user.hover(shareCanShareButtons[0]);
			expect(await screen.findByText(/Edit your collaboration/i)).toBeVisible();
			await user.hover(shareCanShareButtons[1]);
			expect(await screen.findByText(/Edit collaboration/i)).toBeVisible();
			const trashButtons = screen.getAllByRoleWithIcon('button', { icon: ICON_REGEXP.trash });
			await user.hover(trashButtons[0]);
			expect(await screen.findByText(/Remove your collaboration/i)).toBeVisible();
			await user.hover(trashButtons[1]);
			expect(await screen.findByText(/Remove collaboration/i)).toBeVisible();
		});

		describe('EditSharePopover', () => {
			it('should open the popover when click on the edit collaboration button', async () => {
				const node = populateNode();
				node.owner = populateUser();
				const loggedUser = populateUser(LOGGED_USER.id);
				const user2 = populateUser();
				const share1 = populateShare(node, node.id, loggedUser);
				const share2 = populateShare(node, node.id, user2);
				share1.permission = SharePermission.ReadWriteAndShare;
				share2.permission = SharePermission.ReadWriteAndShare;
				node.shares = [share1, share2];
				node.permissions.can_share = true;
				const mocks = {
					Query: {
						getNode: mockGetNode({ getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<NodeSharing node={node} />, { mocks });

				await act(async () => {
					await vi.advanceTimersToNextTimerAsync();
				});
				const editButtons = screen.getAllByRoleWithIcon('button', {
					icon: ICON_REGEXP.edit
				});
				await user.click(editButtons[0]);
				const viewerSelection = screen.getByTestId(SELECTORS.exclusiveSelectionViewer);
				expect(within(viewerSelection).getByTestId(ICON_REGEXP.shareCanRead)).toBeVisible();
				expect(within(viewerSelection).getByText(/viewer/i)).toBeVisible();
				expect(
					within(viewerSelection).getByText(/It will only be able to view or download the item/i)
				).toBeVisible();
				const editorSelection = screen.getByTestId(SELECTORS.exclusiveSelectionEditor);
				expect(within(editorSelection).getByTestId(ICON_REGEXP.shareCanWrite)).toBeVisible();
				expect(
					within(editorSelection).getByText(/It will be able to view and edit the item/i)
				).toBeVisible();
				expect(screen.getByTestId(ICON_REGEXP.checkboxChecked)).toBeVisible();
				expect(screen.getByText(/Sharing allowed/i)).toBeVisible();
				expect(screen.getByText(/It will be able to manage shares of the item/i)).toBeVisible();
				expect(screen.getByRole('button', { name: /save/i })).toBeVisible();
				expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
			});

			it('should enable the save button when there is a change of collaboration', async () => {
				const node = populateNode();
				node.owner = populateUser();
				const loggedUser = populateUser(LOGGED_USER.id);
				const user2 = populateUser();
				const share1 = populateShare(node, node.id, loggedUser);
				const share2 = populateShare(node, node.id, user2);
				share1.permission = SharePermission.ReadWriteAndShare;
				share2.permission = SharePermission.ReadWriteAndShare;
				node.shares = [share1, share2];
				node.permissions.can_share = true;
				const mocks = {
					Query: {
						getNode: mockGetNode({ getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<NodeSharing node={node} />, { mocks });

				await act(async () => {
					await vi.advanceTimersToNextTimerAsync();
				});
				const editButtons = screen.getAllByRoleWithIcon('button', {
					icon: ICON_REGEXP.edit
				});
				await user.click(editButtons[0]);
				const viewerSelection = screen.getByTestId(SELECTORS.exclusiveSelectionViewer);
				await user.click(within(viewerSelection).getByText(/viewer/i));
				expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
			});

			it('should render a modal confirmation when the user tries do decrease his rights', async () => {
				const node = populateNode();
				node.owner = populateUser();
				const loggedUser = populateUser(LOGGED_USER.id);
				const user2 = populateUser();
				const share1 = populateShare(node, node.id, loggedUser);
				const share2 = populateShare(node, node.id, user2);
				share1.permission = SharePermission.ReadWriteAndShare;
				share2.permission = SharePermission.ReadWriteAndShare;
				node.shares = [share1, share2];
				node.permissions.can_share = true;
				const mocks = {
					Query: {
						getNode: mockGetNode({ getShares: [node] }),
						getLinks: mockGetLinks(node.links),
						getCollaborationLinks: mockGetCollaborationLinks([])
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(<NodeSharing node={node} />, { mocks });

				await act(async () => {
					await vi.advanceTimersToNextTimerAsync();
				});
				const editButtons = screen.getAllByRoleWithIcon('button', {
					icon: ICON_REGEXP.edit
				});
				await user.click(editButtons[0]);
				const viewerSelection = screen.getByTestId(SELECTORS.exclusiveSelectionViewer);
				await user.click(within(viewerSelection).getByText(/viewer/i));
				await user.click(screen.getByRole('button', { name: /save/i }));
				const modal = screen.getByTestId(SELECTORS.modal);
				act(() => {
					// run timers of modal
					vi.advanceTimersToNextTimer();
				});
				expect(within(modal).getByText(/Decrease your current rights/i)).toBeVisible();
				expect(
					within(modal).getByText(
						"Are you sure to decrease your rights on this item? The action is permanent and you won't be able to restore the previous share's rights by yourself."
					)
				).toBeVisible();
				expect(
					within(modal).getByText(
						"You can always contact the shared item's owner if you need the previous permission to be restored."
					)
				).toBeVisible();
				expect(within(modal).getByRole('button', { name: /confirm/i })).toBeVisible();
			});
		});
	});

	describe('without share permissions', () => {
		it('should remove the logged user (only logged user chip is removable)', async () => {
			const node = populateNode();
			node.permissions.can_share = false;
			const shares = populateShares(node, 2, true);
			const loggedUserShare = populateShare(node, 'logged-user-share', mockedUserLogged);
			shares.push(loggedUserShare);
			node.shares = shares;
			// set owner different from logged user
			node.owner = populateUser();
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				},
				Mutation: {
					deleteShares: mockDeleteShares([mockedUserLogged.id])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<NodeSharing node={node} />, { mocks });

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			const trashButtons = screen.getAllByRoleWithIcon('button', { icon: ICON_REGEXP.trash });
			await user.click(trashButtons[0]);
			await screen.findByRole('button', { name: /remove/i });
			// run timers of modal
			act(() => {
				vi.advanceTimersToNextTimer();
			});
			expect(
				screen.getByText(/Are you sure to remove yourself from this collaboration/i)
			).toBeVisible();
			expect(
				screen.getByText(/All the access permission previously given to you will be lost/i)
			).toBeVisible();
			await user.click(screen.getByRole('button', { name: /remove/i }));
			await screen.findByText(/success/i);
			// close snackbar
			act(() => {
				// run timers of snackbar
				vi.runOnlyPendingTimers();
			});
			expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
			// logged user chip is removed from the list of collaborators
			expect(screen.queryByText(/you$/)).not.toBeInTheDocument();
		});
	});

	describe('with share permissions', () => {
		it('should not render the remove collaboration button of the owner', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			node.shares = [populateShare(node, 'key', populateUser(LOGGED_USER.id))];
			// set owner different from logged user
			node.owner = populateUser();
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				}
			} satisfies Partial<Resolvers>;
			setup(<NodeSharing node={node} />, { mocks });

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(screen.getAllByRoleWithIcon('button', { icon: ICON_REGEXP.trash })).toHaveLength(1);
		});

		it('should remove the collaborator if share is deleted', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			const userAccount = populateUser();
			const share = populateShare(node, 'key', userAccount);
			node.shares = [share];
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				},
				Mutation: {
					deleteShares: mockDeleteShares([userAccount.id])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<NodeSharing node={node} />, {
				mocks
			});

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.trash }));
			await user.click(screen.getByRole('button', { name: /remove/i }));
			// run timers of modal
			act(() => {
				vi.advanceTimersToNextTimer();
			});
			await screen.findByText(/success/i);
			expect(screen.queryByText(getChipLabel(userAccount))).not.toBeInTheDocument();
		});

		it('should add the new collaborator', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_share = true;
			node.links = [];
			node.shares = [];
			node.collaboration_links = [];
			const userAccount = populateUser();
			// put email to lowercase otherwise the regexp split parts in a weird way
			userAccount.email = userAccount.email.toLowerCase();
			const shareToCreate = populateShare(node, 'new-share', userAccount);
			shareToCreate.permission = SharePermission.ReadWriteAndShare;
			// mock soap fetch implementation
			mockedSoapFetch.mockReturnValue({
				AutoCompleteResponse: {
					match: [
						populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
						populateGalContact(userAccount.full_name, userAccount.email),
						populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
					]
				}
			});
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks([]),
					getCollaborationLinks: mockGetCollaborationLinks([]),
					getAccountByEmail: mockGetAccountByEmail(userAccount)
				},
				Mutation: {
					createShare: mockCreateShare(shareToCreate)
				}
			} satisfies Partial<Resolvers>;

			// write getNode query in cache and set initial router entry to contain active node id
			global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
				query: GetNodeDocument,
				variables: getNodeVariables(node.id),
				data: {
					getNode: node
				}
			});
			const { user } = setup(<NodeSharing node={node} />, {
				mocks,
				initialRouterEntries: [`/?node=${node.id}`]
			});
			// run queries
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			const chipInput = screen.getByRole('textbox', { name: /Add new people or groups/i });
			// type just the first character because the network search is requested only one time with first character.
			// All characters typed after the first one are just used to filter out the result obtained before
			await user.type(chipInput, userAccount.full_name[0]);
			const collaborator = await screen.findByText(userAccount.full_name);
			// click on the dropdown element to create the collaborator
			await user.click(collaborator);
			// and then the new share is created as a chip
			// change permissions on the new share
			await user.click(
				screen.getByRoleWithIcon('button', {
					icon: ICON_REGEXP.shareOff,
					name: /viewer/i
				})
			);
			await user.click(
				within(screen.getByTestId(SELECTORS.exclusiveSelectionEditor)).getByText(/editor/i)
			);
			// give share permissions to the new share
			await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
			// click on the share button to complete the creation of the new share
			await user.click(screen.getByRole('button', { name: /share/i }));
			// and then the new collaborator is created in the collaborator list
			const collaborationSection = screen.getByTestId(SELECTORS.sharingCollaboratorsSection);
			expect(within(collaborationSection).getByText(getChipLabel(userAccount))).toBeVisible();
		});

		it('should add multiple collaborators and clear the chip input', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_share = true;
			node.links = [];
			node.shares = [];
			const userAccount1 = populateUser();
			const userAccount2 = populateUser();
			// put email to lowercase otherwise the regexp split parts in a weird way
			userAccount1.email = userAccount1.email.toLowerCase();
			userAccount2.email = userAccount2.email.toLowerCase();
			const shareToCreate1 = populateShare(node, 'new-share', userAccount1);
			const shareToCreate2 = populateShare(node, 'new-share', userAccount2);
			shareToCreate1.permission = SharePermission.ReadWriteAndShare;
			shareToCreate2.permission = SharePermission.ReadWriteAndShare;
			// mock soap fetch implementation
			mockedSoapFetch
				.mockReturnValueOnce({
					AutoCompleteResponse: {
						match: [
							populateGalContact(`${userAccount1.full_name[0]}-other-contact-1`),
							populateGalContact(userAccount1.full_name, userAccount1.email),
							populateGalContact(`${userAccount1.full_name[0]}-other-contact-2`)
						]
					}
				})
				.mockReturnValueOnce({
					AutoCompleteResponse: {
						match: [
							populateGalContact(`${userAccount2.full_name[0]}-other-contact-1`),
							populateGalContact(userAccount2.full_name, userAccount2.email)
						]
					}
				});

			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks([]),
					getCollaborationLinks: mockGetCollaborationLinks([]),
					getAccountByEmail: mockGetAccountByEmail(userAccount1, userAccount2)
				},
				Mutation: {
					createShare: mockCreateShare(shareToCreate1, shareToCreate2)
				}
			} satisfies Partial<Resolvers>;

			// write getNode query in cache and set initial router entry to contain active node id
			global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
				query: GetNodeDocument,
				variables: getNodeVariables(node.id),
				data: {
					getNode: node
				}
			});
			const { user } = setup(<NodeSharing node={node} />, {
				mocks,
				initialRouterEntries: [`/?node=${node.id}`]
			});
			// run queries
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			const chipInput = screen.getByRole('textbox', { name: /Add new people or groups/i });
			// type just the first character because the network search is requested only one time with first character.
			// All characters typed after the first one are just used to filter out the result obtained before
			await user.type(chipInput, userAccount1.full_name[0]);
			// click on the dropdown element to create the chip
			await user.click(await screen.findByText(userAccount1.full_name));
			// and then the new share is created as a chip
			await user.type(chipInput, userAccount2.full_name[0]);
			await user.click(await screen.findByText(userAccount2.full_name));
			// change permissions on the new shares
			await user.click(
				screen.getByRoleWithIcon('button', {
					icon: ICON_REGEXP.shareOff,
					name: /viewer/i
				})
			);
			await user.click(
				within(screen.getByTestId(SELECTORS.exclusiveSelectionEditor)).getByText(/editor/i)
			);
			// give share permissions to the new share
			await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
			// click on the share button to complete the creation of the new share
			await user.click(screen.getByRole('button', { name: /share/i }));
			// and then the new collaborator is created in the collaborator list
			const collaborationSection = screen.getByTestId(SELECTORS.sharingCollaboratorsSection);
			expect(within(collaborationSection).getByText(getChipLabel(userAccount1))).toBeVisible();
			expect(within(collaborationSection).getByText(getChipLabel(userAccount2))).toBeVisible();
			const icons1 = within(collaborationSection).getAllByRoleWithIcon('button', {
				icon: ICON_REGEXP.edit
			});
			const icons2 = within(collaborationSection).getAllByRoleWithIcon('button', {
				icon: ICON_REGEXP.shareCanShare
			});
			expect(icons1).toHaveLength(2);
			expect(icons2).toHaveLength(2);
			// no chip visible
			expect(screen.queryByTestId(SELECTORS.chip)).not.toBeInTheDocument();
		});
	});

	it('should add a new collaboration link with only view permission by default', async () => {
		const node = populateNode();
		node.permissions.can_write_file = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_share = true;
		node.links = [];
		node.shares = [];
		node.collaboration_links = [];
		const userAccount = populateUser();
		// put email to lowercase otherwise the regexp split parts in a weird way
		userAccount.email = userAccount.email.toLowerCase();
		const shareToCreate = populateShare(node, 'new-share', userAccount);
		shareToCreate.permission = SharePermission.ReadOnly;
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValueOnce({
			AutoCompleteResponse: {
				match: [
					populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
					populateGalContact(userAccount.full_name, userAccount.email),
					populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
				]
			}
		});

		const mocks = {
			Query: {
				getNode: mockGetNode({ getShares: [node] }),
				getLinks: mockGetLinks([]),
				getCollaborationLinks: mockGetCollaborationLinks([]),
				getAccountByEmail: mockGetAccountByEmail(userAccount)
			},
			Mutation: {
				createShare: mockCreateShare(shareToCreate)
			}
		} satisfies Partial<Resolvers>;

		// write getNode query in cache and set initial router entry to contain active node id
		global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
			query: GetNodeDocument,
			variables: getNodeVariables(node.id),
			data: {
				getNode: node
			}
		});
		const { user } = setup(<NodeSharing node={node} />, {
			mocks,
			initialRouterEntries: [`/?node=${node.id}`]
		});

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		const chipInput = screen.getByRole('textbox', { name: /Add new people or groups/i });
		await user.type(chipInput, userAccount.full_name[0]);
		const collaborator = await screen.findByText(userAccount.full_name);
		await user.click(collaborator);
		await user.click(screen.getByRole('button', { name: /share/i }));
		const collaborationSection = screen.getByTestId(SELECTORS.sharingCollaboratorsSection);
		expect(within(collaborationSection).getByText(getChipLabel(userAccount))).toBeVisible();
		expect(
			within(collaborationSection).getByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanRead })
		).toBeVisible();
		expect(
			within(collaborationSection).getByRoleWithIcon('button', { icon: ICON_REGEXP.shareOff })
		).toBeVisible();
	});
});
