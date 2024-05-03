/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, waitFor } from '@testing-library/react';
import { forEach } from 'lodash';

import { NodeSharing } from './NodeSharing';
import * as actualNetworkModule from '../../../../network/network';
import { ICON_REGEXP, SELECTORS } from '../../../constants/test';
import {
	populateDistributionList,
	populateGalContact,
	populateNode,
	populateShare,
	populateShares,
	populateUser
} from '../../../mocks/mockUtils';
import { Resolvers } from '../../../types/graphql/resolvers-types';
import {
	GetNodeDocument,
	GetNodeQuery,
	GetNodeQueryVariables,
	SharedTarget,
	SharePermission,
	User
} from '../../../types/graphql/types';
import {
	mockCreateShare,
	mockDeleteShare,
	mockGetAccountByEmail,
	mockGetNode,
	mockGetCollaborationLinks,
	mockGetLinks,
	mockUpdateShare,
	getNodeVariables
} from '../../../utils/resolverMocks';
import { setup, screen, within } from '../../../utils/testUtils';
import { getChipLabel } from '../../../utils/utils';

let mockedUserLogged: User;
const mockedSoapFetch = jest.fn();

beforeEach(() => {
	mockedUserLogged = populateUser(global.mockedUserLogged.id, global.mockedUserLogged.name);
});

jest.mock<typeof import('../../../../network/network')>('../../../../network/network', () => ({
	soapFetch: <Req, Res extends Record<string, unknown>>(): ReturnType<
		typeof actualNetworkModule.soapFetch<Req, Res>
	> =>
		new Promise<Res>((resolve, reject) => {
			const result = mockedSoapFetch();
			result ? resolve(result) : reject(new Error('no result provided'));
		})
}));

describe('Node Sharing', () => {
	test('render collaborators with owner as first one and logged user as second one', async () => {
		const node = populateNode();
		const userAccount = populateUser();
		const distributionList = populateDistributionList(3);
		const userShare = populateShare(node, 'user-share', userAccount);
		const dlShare = populateShare(node, 'dl-share', distributionList);
		const loggedUserShare = populateShare(node, 'logged-user-share', mockedUserLogged);
		node.shares = [userShare, dlShare, loggedUserShare];
		// set an owner different from logged user
		node.owner = populateUser();
		const mocks = {
			Query: {
				getNode: mockGetNode({ getShares: [node] }),
				getLinks: mockGetLinks(node.links),
				getCollaborationLinks: mockGetCollaborationLinks([])
			}
		} satisfies Partial<Resolvers>;
		const { getByTextWithMarkup } = setup(<NodeSharing node={node} />, { mocks });
		await screen.findByText(/collaborators/i);
		await screen.findByText(userAccount.full_name);
		expect(screen.getByText(/owner/i)).toBeVisible();
		expect(screen.getByText(node.owner.full_name)).toBeVisible();
		expect(screen.getByText(userAccount.full_name)).toBeVisible();
		expect(screen.getByText(distributionList.name)).toBeVisible();
		expect(screen.queryByText(mockedUserLogged.full_name)).not.toBeInTheDocument();
		expect(screen.getByText(/you$/i)).toBeVisible();
		// check order of chips with a regexp
		// order is: <owner chip -> name - owner> <logged user chip -> YU (avatar label) You> <other collaborators>
		expect(
			getByTextWithMarkup(RegExp(`\\s*${node.owner.full_name}\\s*-\\s*owner\\s*YU\\s*you\\s*`, 'i'))
		).toBeInTheDocument();
	});

	describe('without share permissions', () => {
		test('render an info panel with explanation and collaborators. Add sharing panel is hidden', async () => {
			const node = populateNode();
			node.permissions.can_share = false;
			const shares = populateShares(node, 10);
			node.shares = shares;
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] })
				}
			} satisfies Partial<Resolvers>;
			setup(<NodeSharing node={node} />, { mocks });
			await screen.findByText(getChipLabel(shares[0].share_target as SharedTarget));
			expect(screen.getByText(/collaborators/i)).toBeVisible();
			forEach(shares, (share) => {
				expect(screen.getByText(getChipLabel(share.share_target as SharedTarget))).toBeVisible();
			});
			expect(screen.getByText(/You are not allowed to share this item/i)).toBeVisible();
			expect(screen.queryByText(/Add new people or groups/i)).not.toBeInTheDocument();
		});

		test('only logged user chip is removable', async () => {
			const node = populateNode();
			node.permissions.can_share = false;
			const shares = populateShares(node, 2);
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
					deleteShare: mockDeleteShare(true)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<NodeSharing node={node} />, { mocks });
			await screen.findByText(getChipLabel(shares[0].share_target as SharedTarget));
			const loggedUserChip = screen
				.getAllByTestId(SELECTORS.chipWithPopover)
				.find((chip) => within(chip).queryByText('You') !== null) as HTMLElement;
			// only 1 icon close is shown, and it is the one of the logged user chip
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.close })).toBe(
				within(loggedUserChip).getByRoleWithIcon('button', { icon: ICON_REGEXP.close })
			);
			await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.close }));
			await screen.findByRole('button', { name: /remove/i });
			// run timers of modal
			act(() => {
				jest.advanceTimersToNextTimer();
			});
			expect(
				screen.getByText(/Are you sure to remove yourself from this collaboration/i)
			).toBeInTheDocument();
			expect(
				screen.getByText(/All the access permission previously given to you will be lost/i)
			).toBeInTheDocument();
			await user.click(screen.getByRole('button', { name: /remove/i }));
			await screen.findByText(/success/i);
			// close snackbar
			act(() => {
				// run timers of snackbar
				jest.runOnlyPendingTimers();
			});
			expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
			// logged user chip is removed from the list of collaborators
			expect(screen.queryByText(/you$/)).not.toBeInTheDocument();
			// no other chip is removable
			expect(screen.queryByTestId(ICON_REGEXP.close)).not.toBeInTheDocument();
		});
	});

	describe('with share permissions', () => {
		test('render collaborators and add sharing panel. Info panel is hidden', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			const shares = populateShares(node, 5);
			node.shares = shares;
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				}
			} satisfies Partial<Resolvers>;
			setup(<NodeSharing node={node} />, { mocks });
			await screen.findByText(getChipLabel(shares[0].share_target as SharedTarget));
			expect(screen.getByText(/collaborators/i)).toBeVisible();
			forEach(shares, (share) => {
				expect(screen.getByText(getChipLabel(share.share_target as SharedTarget))).toBeVisible();
			});
			expect(screen.queryByText(/You are not allowed to share this item/i)).not.toBeInTheDocument();
			expect(screen.getByText(/Add new people or groups/i)).toBeVisible();
		});

		test('owner chip is not removable', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			const shares = populateShares(node, 10);
			node.shares = shares;
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
			await screen.findByText(getChipLabel(shares[0].share_target as SharedTarget));
			const ownerChip = screen
				.getAllByTestId(SELECTORS.chip)
				.find(
					(chip) => within(chip).queryByText((node.owner as User).full_name) !== null
				) as HTMLElement;
			expect(
				within(ownerChip).queryByRoleWithIcon('button', { icon: ICON_REGEXP.close })
			).not.toBeInTheDocument();
		});

		test('collaborator chip is removed if share is deleted', async () => {
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
					deleteShare: mockDeleteShare(true)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<NodeSharing node={node} />, {
				mocks
			});
			await screen.findByText(userAccount.full_name);
			const collaboratorChip = screen
				.getAllByTestId(SELECTORS.chipWithPopover)
				.find((chip) => within(chip).queryByText(userAccount.full_name) !== null) as HTMLElement;
			await user.click(
				within(collaboratorChip).getByRoleWithIcon('button', { icon: ICON_REGEXP.close })
			);
			await screen.findByRole('button', { name: /remove/i });
			// run timers of modal
			act(() => {
				jest.advanceTimersToNextTimer();
			});
			const regexp = RegExp(
				`Are you sure to remove all the access permission previously given to\\s*${userAccount.full_name}\\s*?`,
				'i'
			);
			expect(screen.getByTextWithMarkup(regexp)).toBeInTheDocument();
			await user.click(screen.getByRole('button', { name: /remove/i }));
			await screen.findByText(/success/i);
			// collaborator chip is removed from the list of collaborators
			expect(screen.queryByText(userAccount.full_name)).not.toBeInTheDocument();
		});

		test('click on a collaborator chip open edit popover. On save only active chip is updated', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_share = true;
			const shares = populateShares(node, 5);
			forEach(shares, (share) => {
				share.permission = SharePermission.ReadOnly;
			});
			node.shares = shares;
			const shareToUpdate = { ...shares[0], share_target: shares[0].share_target as SharedTarget };
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
					getCollaborationLinks: mockGetCollaborationLinks([])
				},
				Mutation: {
					updateShare: mockUpdateShare({
						...shareToUpdate,
						permission: SharePermission.ReadWriteAndShare
					})
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<NodeSharing node={node} />, { mocks });
			await screen.findByText(getChipLabel(shareToUpdate.share_target));
			const collaboratorsContainer = screen.getByTestId(SELECTORS.sharingTabCollaborators);
			// all shares are set to be read-only so all chips should show EyeOutline icon
			expect(within(collaboratorsContainer).getAllByTestId(ICON_REGEXP.shareCanRead)).toHaveLength(
				shares.length
			);
			expect(
				within(collaboratorsContainer).queryByTestId(ICON_REGEXP.shareCanWrite)
			).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.shareCanShare)).not.toBeInTheDocument();
			// click on chip to open popover
			const shareChip = screen
				.getAllByTestId(SELECTORS.chipWithPopover)
				.find((chip) =>
					within(chip).queryByText(getChipLabel(shareToUpdate.share_target))
				) as HTMLElement;
			await user.click(
				within(shareChip).getByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanRead })
			);
			// change share role to be editor allowed to share
			await user.click(await screen.findByText(/editor/i));
			await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeEnabled());
			await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
			await screen.findByTestId(ICON_REGEXP.checkboxChecked);
			await user.click(screen.getByRole('button', { name: /save/i }));
			expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
			await within(shareChip).findByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanWrite });
			await within(shareChip).findByTestId(ICON_REGEXP.shareCanShare);
			expect(
				within(collaboratorsContainer).getAllByRoleWithIcon('button', {
					icon: ICON_REGEXP.shareCanRead
				})
			).toHaveLength(shares.length - 1);
		});

		test('add of a collaborator render the new chip in the collaborators list', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_share = true;
			const share = populateShare(node, 'existing-share');
			share.permission = SharePermission.ReadOnly;
			node.shares = [share];
			const userAccount = populateUser();
			// put email to lowercase otherwise the regexp split parts in a weird way
			userAccount.email = userAccount.email.toLowerCase();
			const shareToCreate = populateShare(node, 'new-share', userAccount);
			shareToCreate.permission = SharePermission.ReadWriteAndShare;
			// mock soap fetch implementation
			mockedSoapFetch.mockReturnValue({
				match: [
					populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
					populateGalContact(userAccount.full_name, userAccount.email),
					populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
				]
			});
			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
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
			await screen.findByText(getChipLabel(share.share_target as SharedTarget));
			const chipInput = screen.getByRole('textbox', { name: /Add new people or groups/i });
			// type just the first character because the network search is requested only one time with first character.
			// All characters typed after the first one are just used to filter out the result obtained before
			await user.type(chipInput, userAccount.full_name[0]);
			// click on the dropdown element to create the chip
			await user.click(await screen.findByText(userAccount.full_name));
			// and then the new share is created as a chip
			const newChip = (await screen.findAllByTestId(SELECTORS.chipWithPopover)).find(
				(chip) => within(chip).queryByText(userAccount.full_name) !== null
			) as HTMLElement;
			// new share is created with read-only permissions by default so now there are 2 icons EyeOutline
			expect(
				within(newChip).getByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanRead })
			).toBeVisible();
			// change permissions on the new share
			await user.click(
				within(newChip).getByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanRead })
			);
			// the popover to change permission is shown
			await screen.findByText(/editor/i);
			// make popover register listeners
			jest.advanceTimersToNextTimer();
			// click on editor
			await user.click(screen.getByText(/editor/i));
			// icon on chip is immediately updated
			await within(newChip).findByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanWrite });
			// give share permissions to the new share
			await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
			// icon share is now visible on chip
			expect(await within(newChip).findByTestId(ICON_REGEXP.shareCanShare)).toBeVisible();
			// click on share button to complete the creation of the new share
			await user.click(screen.getByRole('button', { name: /share/i }));
			// and then a new chip is created in the collaborators list
			const createdChip = (await screen.findAllByTestId(SELECTORS.chipWithPopover)).find(
				(chip) => within(chip).queryByText(userAccount.full_name) !== null
			) as HTMLElement;
			// share is created with read, write and share permissions, so edit and share icons are visible
			expect(createdChip).toBeVisible();
			expect(
				within(createdChip).getByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanWrite })
			).toBeVisible();
			expect(
				within(createdChip).getByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanShare })
			).toBeVisible();
		});

		test('multiple share creation clears the add section and update collaborators list with newly created shares', async () => {
			const node = populateNode();
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_share = true;
			const share = populateShare(node, 'existing-share');
			share.permission = SharePermission.ReadOnly;
			node.shares = [share];
			const userAccount1 = populateUser();
			// put email to lowercase otherwise the regexp split parts in a weird way
			userAccount1.email = userAccount1.email.toLowerCase();
			const userAccount2 = populateUser();
			userAccount2.email = userAccount2.email.toLowerCase();
			const shareToCreate1 = populateShare(node, 'new-share-1', userAccount1);
			shareToCreate1.permission = SharePermission.ReadAndWrite;

			const shareToCreate2 = populateShare(node, 'new-share-2', userAccount2);
			shareToCreate2.permission = SharePermission.ReadAndShare;
			// mock soap fetch implementation
			mockedSoapFetch
				.mockReturnValueOnce({
					match: [
						populateGalContact(`${userAccount1.full_name[0]}-other-contact-1`),
						populateGalContact(userAccount1.full_name, userAccount1.email),
						populateGalContact(`${userAccount1.full_name[0]}-other-contact-2`)
					]
				})
				.mockReturnValueOnce({
					match: [
						populateGalContact(`${userAccount2.full_name[0]}-other-contact-1`),
						populateGalContact(userAccount2.full_name, userAccount2.email)
					]
				});

			const mocks = {
				Query: {
					getNode: mockGetNode({ getShares: [node] }),
					getLinks: mockGetLinks(node.links),
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
			await screen.findByText(getChipLabel(share.share_target as SharedTarget));
			const chipInput = screen.getByRole('textbox', { name: /Add new people or groups/i });
			// type just the first character because the network search is requested only one time with first character.
			// All characters typed after the first one are just used to filter out the result obtained before
			await user.type(chipInput, userAccount1.full_name[0]);
			// now click on the dropdown element to create the chip
			await user.click(await screen.findByText(userAccount1.full_name));
			// and then the new share is created as a chip
			const addChip1 = (await screen.findAllByTestId(SELECTORS.chipWithPopover)).find(
				(chip) => within(chip).queryByText(userAccount1.full_name) !== null
			) as HTMLElement;
			// change permissions on the new share
			await user.click(
				within(addChip1).getByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanRead })
			);
			// the popover to change permission is shown
			await screen.findByText(/editor/i);
			// register listeners of the popover
			jest.advanceTimersToNextTimer();
			// click on editor to set read and write share permissions
			await user.click(screen.getByText(/editor/i));
			// icon on chip is immediately updated, so the edit icons become 2
			await within(addChip1).findByTestId(ICON_REGEXP.shareCanWrite);
			// now create the second share
			// type just the first character because the network search is requested only one time with first character.
			// All characters typed after the first one are just used to filter out the result obtained before
			await user.type(chipInput, userAccount2.full_name[0]);
			// now click on the dropdown element to create the chip
			await user.click(await screen.findByText(userAccount2.full_name));
			// and then the new share is created as a chip
			const addChip2 = (await screen.findAllByTestId(SELECTORS.chipWithPopover)).find(
				(chip) => within(chip).queryByText(userAccount2.full_name) !== null
			) as HTMLElement;
			// change permissions on the new share
			await user.click(
				within(addChip2).getByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanRead })
			);
			// the popover to change permission is shown
			await screen.findByTestId(ICON_REGEXP.checkboxUnchecked);
			// wait for the listener of the popover to be registered
			jest.advanceTimersToNextTimer();
			// click on the checkbox to set read and share permissions
			await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
			await screen.findByTestId(ICON_REGEXP.checkboxChecked);
			// the chip is updated immediately so the icon share is shown
			await within(addChip2).findByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanShare });
			// click on share button to complete the creation of the new share
			await user.click(screen.getByRole('button', { name: /share/i }));
			// chips are removed from the add section
			expect(
				within(screen.getByTestId(SELECTORS.addShareChipInput)).queryByTestId(
					SELECTORS.chipWithPopover
				)
			).not.toBeInTheDocument();
			// and then the new chips are created in the collaborators list
			const chip1 = (await screen.findAllByTestId(SELECTORS.chipWithPopover)).find(
				(chip) => within(chip).queryByText(userAccount1.full_name) !== null
			) as HTMLElement;
			const chip2 = (await screen.findAllByTestId(SELECTORS.chipWithPopover)).find(
				(chip) => within(chip).queryByText(userAccount2.full_name) !== null
			) as HTMLElement;
			// shares are created with previously set permissions
			// share 1 with write
			expect(
				within(chip1).getByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanWrite })
			).toBeVisible();
			// share 2 with share and read
			expect(
				within(chip2).getByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanShare })
			).toBeVisible();
			expect(
				within(chip2).getByRoleWithIcon('button', { icon: ICON_REGEXP.shareCanRead })
			).toBeVisible();
		});
	});
});
