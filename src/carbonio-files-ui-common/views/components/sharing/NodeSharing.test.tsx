/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, screen, waitFor, within } from '@testing-library/react';
import { forEach } from 'lodash';

import { NodeSharing } from './NodeSharing';
import { ICON_REGEXP, SELECTORS } from '../../../constants/test';
import {
	populateGalContact,
	populateDistributionList,
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
import { setup } from '../../../utils/testUtils';
import { getChipLabel } from '../../../utils/utils';

let mockedUserLogged: User;
const mockedSoapFetch: jest.Mock = jest.fn();

beforeEach(() => {
	mockedUserLogged = populateUser(global.mockedUserLogged.id, global.mockedUserLogged.name);
});

jest.mock('../../../../network/network', () => ({
	soapFetch: (): Promise<unknown> =>
		new Promise((resolve, reject) => {
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
			expect(screen.getByText(/you$/i)).toBeVisible();
			// only 1 icon close is shown, and it is the one of the logged user chip
			expect(screen.getByTestId(ICON_REGEXP.close)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.close));
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
			expect(screen.getByText(node.owner.full_name)).toBeVisible();
			expect(screen.getAllByTestId(ICON_REGEXP.close)).toHaveLength(shares.length);
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
			const { getByTextWithMarkup, user } = setup(<NodeSharing node={node} />, {
				mocks
			});
			await screen.findByText(userAccount.full_name);
			// only 1 icon close is shown, and it is the one of the collaborator
			expect(screen.getByTestId(ICON_REGEXP.close)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.close));
			await screen.findByRole('button', { name: /remove/i });
			// run timers of modal
			act(() => {
				jest.advanceTimersToNextTimer();
			});
			const regexp = RegExp(
				`Are you sure to remove all the access permission previously given to\\s*${userAccount.full_name}\\s*?`,
				'i'
			);
			expect(getByTextWithMarkup(regexp)).toBeInTheDocument();
			await user.click(screen.getByRole('button', { name: /remove/i }));
			await screen.findByText(/success/i);
			// close snackbar
			act(() => {
				// run timers of modal
				jest.runOnlyPendingTimers();
			});
			expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
			// collaborator chip is removed from the list of collaborators
			expect(screen.queryByText(userAccount.full_name)).not.toBeInTheDocument();
			// no other chip is removable
			expect(screen.queryByTestId(ICON_REGEXP.close)).not.toBeInTheDocument();
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
			// open on chip to open popover
			await user.click(screen.getAllByTestId(ICON_REGEXP.shareCanRead)[0]);
			await screen.findByText(/viewer/i);
			// await screen.findByText(/edit collaboration/i);
			expect(screen.getByText(/viewer/i)).toBeVisible();
			expect(screen.getByText(/editor/i)).toBeVisible();
			expect(screen.getByText(/sharing allowed/i)).toBeVisible();
			// change share role to be editor allowed to share
			await user.click(screen.getByText(/editor/i));
			await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeEnabled());
			await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
			await screen.findByTestId(ICON_REGEXP.checkboxChecked);
			await user.click(screen.getByRole('button', { name: /save/i }));
			expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
			await within(screen.getByTestId(SELECTORS.sharingTabCollaborators)).findByTestId(
				ICON_REGEXP.shareCanWrite
			);
			await screen.findByTestId(ICON_REGEXP.shareCanShare);
			expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
			expect(within(collaboratorsContainer).getAllByTestId(ICON_REGEXP.shareCanRead)).toHaveLength(
				shares.length - 1
			);
			expect(within(collaboratorsContainer).getByTestId(ICON_REGEXP.shareCanWrite)).toBeVisible();
			expect(within(collaboratorsContainer).getByTestId(ICON_REGEXP.shareCanShare)).toBeVisible();
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
			const collaboratorsContainer = screen.getByTestId(SELECTORS.sharingTabCollaborators);
			await within(collaboratorsContainer).findByTestId(ICON_REGEXP.shareCanRead);
			expect(screen.getByText(/Add new people or groups/i)).toBeVisible();
			expect(screen.getByRole('button', { name: /share/i })).toBeVisible();
			expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
			// only 1 icon EyeOutline is visible, the one of the existing share
			expect(within(collaboratorsContainer).getByTestId(ICON_REGEXP.shareCanRead)).toBeVisible();
			const chipInput = screen.getByRole('textbox', { name: /Add new people or groups/i });
			// type just the first character because the network search is requested only one time with first character.
			// All characters typed after the first one are just used to filter out the result obtained before
			await user.type(chipInput, userAccount.full_name[0]);
			// wanted contact is shown in the dropdown
			await screen.findByTestId(SELECTORS.dropdownList);
			await screen.findByText(userAccount.full_name);
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			expect(screen.getByText(userAccount.email)).toBeVisible();
			expect(
				screen.getByText(RegExp(`${userAccount.full_name[0]}-other-contact-1`, 'i'))
			).toBeVisible();
			expect(
				screen.getByText(RegExp(`${userAccount.full_name[0]}-other-contact-2`, 'i'))
			).toBeVisible();
			// share button is still disabled since no valid contact has been selected yet
			expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
			// now click on the dropdown element to create the chip
			await user.click(screen.getByText(userAccount.full_name));
			// and then the new share is created as a chip
			await screen.findByText(userAccount.full_name);
			expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
			expect(screen.queryByText(/other-contact/i)).not.toBeInTheDocument();
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			// new share is created with read-only permissions by default so now there are 2 icons EyeOutline
			expect(within(collaboratorsContainer).getAllByTestId(ICON_REGEXP.shareCanRead)).toHaveLength(
				2
			);
			// no one has the edit icon for now
			expect(
				within(collaboratorsContainer).queryByTestId(ICON_REGEXP.shareCanWrite)
			).not.toBeInTheDocument();
			// share button is enabled
			expect(screen.getByRole('button', { name: /share/i })).toBeEnabled();
			// change permissions on the new share
			await user.click(screen.getAllByTestId(ICON_REGEXP.shareCanRead)[1]);
			// the popover to change permission is shown
			await screen.findByText(/editor/i);
			// wait for the listener of the popover to be registered
			act(() => {
				jest.advanceTimersToNextTimer();
			});
			expect(screen.getByTestId(ICON_REGEXP.checkboxUnchecked)).toBeVisible();
			// save button is not present since the changes on the chip are immediate
			expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
			// now there are 2 icons EyeOutline because one is on the already existing share chip
			// and one in the new share chip.
			// The one inside the popover is not count because we are finding in collaboratorsContainer.
			expect(within(collaboratorsContainer).getAllByTestId(ICON_REGEXP.shareCanRead)).toHaveLength(
				2
			);
			// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
			expect(screen.getByTestId(SELECTORS.exclusiveSelectionEditor)).not.toHaveAttribute(
				'disabled'
			);
			// click on editor
			await user.click(screen.getByText(/editor/i));
			// icon on chip is immediately updated, so the edit icons become 2
			await within(collaboratorsContainer).findByTestId(ICON_REGEXP.shareCanWrite);
			// so now we have 1 icons EyeOutline, the one in the existing share chip
			expect(
				within(collaboratorsContainer).getByTestId(ICON_REGEXP.shareCanRead)
			).toBeInTheDocument();
			// give share permissions to the new share
			await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
			await screen.findByTestId(ICON_REGEXP.shareCanShare);
			// icon share is now visible on chip
			expect(screen.getByTestId(ICON_REGEXP.shareCanShare)).toBeVisible();
			// click on chip to close popover
			await user.click(screen.getByText(userAccount.full_name));
			expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
			// click on share button to complete the creation of the new share
			await user.click(screen.getByRole('button', { name: /share/i }));
			// and then a new chip is created in the collaborators list
			await screen.findByText(userAccount.full_name);
			// popover is closed
			expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
			expect(screen.queryByText(/editor/i)).not.toBeInTheDocument();
			// share is created with read, write and share permissions, so edit and share icons are visible
			expect(screen.getByText(userAccount.full_name)).toBeVisible();
			expect(within(collaboratorsContainer).getByTestId(ICON_REGEXP.shareCanWrite)).toBeVisible();
			expect(screen.getByTestId(ICON_REGEXP.shareCanShare)).toBeVisible();
			// in the collaborators list now there are 2 close icons, one for each collaborator
			expect(screen.getAllByTestId(ICON_REGEXP.close)).toHaveLength(2);
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
			const collaboratorsContainer = screen.getByTestId(SELECTORS.sharingTabCollaborators);
			await within(collaboratorsContainer).findByTestId(ICON_REGEXP.shareCanRead);
			expect(screen.getByText(/Add new people or groups/i)).toBeVisible();
			expect(screen.getByRole('button', { name: /share/i })).toBeVisible();
			expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
			// 1 icon EyeOutline is visible, from the existing share
			expect(within(collaboratorsContainer).getByTestId(ICON_REGEXP.shareCanRead)).toBeVisible();
			const chipInput = screen.getByRole('textbox', { name: /Add new people or groups/i });
			// type just the first character because the network search is requested only one time with first character.
			// All characters typed after the first one are just used to filter out the result obtained before
			await user.type(chipInput, userAccount1.full_name[0]);
			// wanted contact is shown in the dropdown
			await screen.findByTestId(SELECTORS.dropdownList);
			await screen.findByText(userAccount1.full_name);
			expect(screen.getByText(userAccount1.full_name)).toBeVisible();
			expect(screen.getByText(userAccount1.email)).toBeVisible();
			// now click on the dropdown element to create the chip
			await user.click(screen.getByText(userAccount1.full_name));
			// first contacts dropdown is closed
			// await waitForElementToBeRemoved(screen.queryByText(userAccount1.email));
			expect(screen.queryByText(userAccount1.email)).not.toBeInTheDocument();
			// and then the new share is created as a chip
			await screen.findByText(userAccount1.full_name);
			expect(screen.getByText(userAccount1.full_name)).toBeVisible();
			// new share is created with read-only permissions by default so now there are 2 icons EyeOutline
			expect(within(collaboratorsContainer).getAllByTestId(ICON_REGEXP.shareCanRead)).toHaveLength(
				2
			);
			// change permissions on the new share
			await user.click(screen.getAllByTestId(ICON_REGEXP.shareCanRead)[1]);
			// the popover to change permission is shown
			await screen.findByText(/editor/i);
			// register listeners of the popover
			jest.advanceTimersToNextTimer();
			// eslint-disable-next-line no-autofix/jest-dom/prefer-enabled-disabled
			expect(screen.getByTestId(SELECTORS.exclusiveSelectionEditor)).not.toHaveAttribute(
				'disabled'
			);
			// click on editor to set read and write share permissions
			await user.click(screen.getByText(/editor/i));
			// icon on chip is immediately updated, so the edit icons become 2
			await within(collaboratorsContainer).findByTestId(ICON_REGEXP.shareCanWrite);
			// now create the second share
			// type just the first character because the network search is requested only one time with first character.
			// All characters typed after the first one are just used to filter out the result obtained before
			await user.type(chipInput, userAccount2.full_name[0]);
			// wanted contact is shown in the dropdown
			await screen.findByTestId(SELECTORS.dropdownList);
			await screen.findByText(userAccount2.full_name);
			// popover is closed
			expect(screen.getByText(userAccount2.full_name)).toBeVisible();
			expect(screen.getByText(userAccount2.email)).toBeVisible();
			// now click on the dropdown element to create the chip
			await user.click(screen.getByText(userAccount2.full_name));
			// first contacts dropdown is closed
			expect(screen.queryByText(userAccount2.email)).not.toBeInTheDocument();
			// and then the new share is created as a chip
			await screen.findByText(userAccount2.full_name);
			expect(screen.getByText(userAccount2.full_name)).toBeVisible();
			// new share is created with read-only permissions by default so there are again two icon EyeOutline
			// because the other share is set on editor
			expect(within(collaboratorsContainer).getAllByTestId(ICON_REGEXP.shareCanRead)).toHaveLength(
				2
			);
			// change permissions on the new share
			await user.click(screen.getAllByTestId(ICON_REGEXP.shareCanRead)[1]);
			// the popover to change permission is shown
			await screen.findByTestId(ICON_REGEXP.checkboxUnchecked);
			// wait for the listener of the popover to be registered
			jest.advanceTimersToNextTimer();
			// click on the checkbox to set read and share permissions
			await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
			await screen.findByTestId(ICON_REGEXP.checkboxChecked);
			// the chip is updated immediately so the icon share is shown
			await screen.findByTestId(ICON_REGEXP.shareCanShare);
			// click outside to close popover
			await user.click(screen.getByText(/Collaborators/i));
			// popover is closed
			expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
			expect(screen.queryByText(/editor/i)).not.toBeInTheDocument();
			// so now we have 1 share with write permissions (editor icon is shown)
			expect(within(collaboratorsContainer).getByTestId(ICON_REGEXP.shareCanWrite)).toBeVisible();
			// 2 with read permission (the second one created and the already existing share)
			expect(within(collaboratorsContainer).getAllByTestId(ICON_REGEXP.shareCanRead)).toHaveLength(
				2
			);
			// and 1 with share permissions
			expect(screen.getByTestId(ICON_REGEXP.shareCanShare)).toBeVisible();
			// click on share button to complete the creation of the new share
			await user.click(screen.getByRole('button', { name: /share/i }));
			// chips are removed from the add section
			const addSharesChipInput = screen.getByTestId(SELECTORS.addShareChipInput);
			expect(
				within(addSharesChipInput).queryByText(userAccount1.full_name)
			).not.toBeInTheDocument();
			expect(
				within(addSharesChipInput).queryByText(userAccount2.full_name)
			).not.toBeInTheDocument();
			// and then the new chips are created in the collaborators list
			await screen.findByText(userAccount1.full_name);
			await screen.findByText(userAccount2.full_name);
			// shares are created with previously set permissions
			// share 1 with write
			expect(within(collaboratorsContainer).getByTestId(ICON_REGEXP.shareCanWrite)).toBeVisible();
			// share 2 with share
			expect(screen.getByTestId(ICON_REGEXP.shareCanShare)).toBeVisible();
			// and share 2 and pre-existing one with read
			expect(within(collaboratorsContainer).getAllByTestId(ICON_REGEXP.shareCanRead)).toHaveLength(
				2
			);
			// in the collaborators list now there are 3 close icons, one for each collaborator
			expect(screen.getAllByTestId(ICON_REGEXP.close)).toHaveLength(3);
		});
	});
});
