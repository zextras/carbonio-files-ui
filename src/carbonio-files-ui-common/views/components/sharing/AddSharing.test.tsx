/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';

import { AddSharing } from './AddSharing';
import * as actualNetworkModule from '../../../../network/network';
import { ICON_REGEXP, SELECTORS } from '../../../constants/test';
import {
	populateGalContact,
	populateNode,
	populateShare,
	populateUser
} from '../../../mocks/mockUtils';
import { Resolvers } from '../../../types/graphql/resolvers-types';
import {
	GetNodeDocument,
	GetNodeQuery,
	GetNodeQueryVariables,
	Share,
	SharePermission
} from '../../../types/graphql/types';
import {
	getNodeVariables,
	mockCreateShare,
	mockErrorResolver,
	mockGetAccountByEmail
} from '../../../utils/resolverMocks';
import { generateError, setup, within } from '../../../utils/testUtils';

const mockedSoapFetch = jest.fn();

jest.mock<typeof import('../../../../network/network')>('../../../../network/network', () => ({
	soapFetch: <Req, Res extends Record<string, unknown>>(): ReturnType<
		typeof actualNetworkModule.soapFetch<Req, Res>
	> =>
		new Promise<Res>((resolve, reject) => {
			const result = mockedSoapFetch();
			result ? resolve(result) : reject(new Error('no result provided'));
		})
}));

describe('Add Sharing', () => {
	test('contact already added as new share is not shown in dropdown', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		const mocks = {
			Query: {
				getAccountByEmail: mockGetAccountByEmail(userAccount)
			}
		} satisfies Partial<Resolvers>;
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
				populateGalContact(userAccount.full_name, userAccount.email),
				populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
			]
		});

		const { user } = setup(<AddSharing node={node} />, { mocks });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findByText(userAccount.email);
		await user.click(await screen.findByText(userAccount.email));
		// chip is created
		await screen.findByTestId(SELECTORS.chipWithPopover);
		// now try to add a new share with the same email
		await user.type(chipInput, userAccount.full_name[0]);
		await screen.findAllByText(/other-contact/i);
		// email of previously added contact is not shown because this contact is filtered out from the dropdown
		expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
	});

	test('contact already existing as share is not shown in dropdown', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		const share = populateShare(node, 'existing-share-1', userAccount);
		node.shares = [share];
		const mocks = {
			Query: {
				getAccountByEmail: mockGetAccountByEmail(userAccount)
			}
		} satisfies Partial<Resolvers>;
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
				populateGalContact(userAccount.full_name, userAccount.email),
				populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
			]
		});

		const { user } = setup(<AddSharing node={node} />, { mocks });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findAllByText(/other-contact/i);
		// already existing contact is not shown
		expect(screen.queryByText(userAccount.full_name)).not.toBeInTheDocument();
		expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
	});

	test('contact of owner is not shown in dropdown', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		node.owner = userAccount;
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
				populateGalContact(userAccount.full_name, userAccount.email),
				populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
			]
		});

		const { user } = setup(<AddSharing node={node} />, { mocks: {} });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findAllByText(/other-contact/i);
		// owner contact is not shown
		expect(screen.queryByText(userAccount.full_name)).not.toBeInTheDocument();
		expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
	});

	test('contacts with same email are shown as uniq entry in dropdown', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact('contact-1', 'contact1@example.com'),
				populateGalContact('contact-2', 'contactsamemail@example.com'),
				populateGalContact('contact-3', 'contactsamemail@example.com'),
				populateGalContact('contact-4', 'contact4@example.com')
			]
		});

		const { user } = setup(<AddSharing node={node} />, { mocks: {} });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		await user.type(chipInput, 'c');
		// wait for the dropdown to be shown
		await screen.findAllByText(/contact/i);
		expect(screen.getByText('contactsamemail@example.com')).toBeVisible();
		expect(screen.getByText('contact-4')).toBeVisible();
		expect(screen.queryByText('contact-3')).not.toBeInTheDocument();
	});

	test('when user delete text inside chip input dropdown is cleared', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact('contact-1', 'contact1@example.com'),
				populateGalContact('contact-2', 'contact2@example.com'),
				populateGalContact('contact-3', 'contact3@example.com')
			]
		});

		const { user } = setup(<AddSharing node={node} />, { mocks: {} });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		await user.type(chipInput, 'c');
		// wait for the dropdown to be shown
		await screen.findAllByText(/contact/i);
		// dropdown contains 3 entries
		expect(screen.getAllByText(/contact-[1-3]/i)).toHaveLength(3);
		// delete input with backspace
		await user.type(chipInput, '{backspace}', { skipClick: true });
		await waitForElementToBeRemoved(screen.queryAllByText(/contact/i));
		expect(screen.queryByText(/contact/i)).not.toBeInTheDocument();
	});

	test('when user select a contact from the dropdown the chip is created with default permissions', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		const share = populateShare(node, 'new-share', userAccount);
		share.permission = SharePermission.ReadOnly;
		const mocks = {
			Query: {
				getAccountByEmail: mockGetAccountByEmail(userAccount)
			}
		} satisfies Partial<Resolvers>;
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
				populateGalContact(userAccount.full_name, userAccount.email),
				populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
			]
		});

		const { user } = setup(<AddSharing node={node} />, { mocks });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await user.click(await screen.findByText(userAccount.email));
		// chip is created
		const chip = await screen.findByTestId(SELECTORS.chipWithPopover);
		// chip is created with read-only permissions
		expect(within(chip).getByTestId(ICON_REGEXP.shareCanRead)).toBeVisible();
		expect(within(chip).queryByTestId(ICON_REGEXP.shareCanWrite)).not.toBeInTheDocument();
		expect(within(chip).queryByTestId(ICON_REGEXP.shareCanShare)).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /share/i })).toBeEnabled();
	});

	test('when user click on a new share permissions icon button of the chip the popover is shown', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		const mocks = {
			Query: {
				getAccountByEmail: mockGetAccountByEmail(userAccount)
			}
		} satisfies Partial<Resolvers>;
		// mock soap fetch implementation
		const contact = populateGalContact(userAccount.full_name, userAccount.email);
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
				contact,
				populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
			]
		});

		const { user } = setup(<AddSharing node={node} />, { mocks });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await user.click(await screen.findByText(userAccount.email));
		// chip is created
		await screen.findByTestId(SELECTORS.chipWithPopover);
		// click on the chip to open the popover
		await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));
		await screen.findByText(/viewer/i);
		// advance timers to make the popover register listeners
		jest.advanceTimersToNextTimer();
		expect(screen.getByText(/viewer/i)).toBeVisible();
		expect(screen.getByText(/editor/i)).toBeVisible();
		expect(screen.getByText(/sharing allowed/i)).toBeVisible();
	});

	test('when user changes permissions from the popover the chip is immediately updated', async () => {
		const node = populateNode();
		node.permissions.can_write_file = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		const share = populateShare(node, 'new-share', userAccount);
		share.permission = SharePermission.ReadWriteAndShare;
		const mocks = {
			Query: {
				getAccountByEmail: mockGetAccountByEmail(userAccount)
			}
		} satisfies Partial<Resolvers>;
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
				populateGalContact(userAccount.full_name, userAccount.email),
				populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
			]
		});
		// write getNode in cache since it is used to establish permissions
		global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
			query: GetNodeDocument,
			variables: getNodeVariables(node.id),
			data: {
				getNode: node
			}
		});

		const { user } = setup(<AddSharing node={node} />, {
			mocks,
			initialRouterEntries: [`/?node=${node.id}`]
		});
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await user.click(await screen.findByText(userAccount.email));
		// chip is created
		const chip = await screen.findByTestId(SELECTORS.chipWithPopover);
		// chip is created with read-only permissions
		expect(within(chip).getByTestId(ICON_REGEXP.shareCanRead)).toBeVisible();
		expect(within(chip).queryByTestId(ICON_REGEXP.shareCanWrite)).not.toBeInTheDocument();
		expect(within(chip).queryByTestId(ICON_REGEXP.shareCanShare)).not.toBeInTheDocument();
		// click on chip to open popover
		await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));
		await screen.findByText(/editor/i);
		// advance timers to make the popover register listeners
		jest.advanceTimersToNextTimer();
		await user.click(screen.getByText(/editor/i));
		expect(await within(chip).findByTestId(ICON_REGEXP.shareCanWrite)).toBeVisible();
		// now select the share permission
		await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
		// wait for chip to update with share permission icon
		expect(await within(chip).findByTestId(ICON_REGEXP.shareCanShare)).toBeVisible();
	});

	test('without write permissions editor role cannot be selected', async () => {
		const node = populateNode();
		node.permissions.can_write_file = false;
		node.permissions.can_write_folder = false;
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		const share = populateShare(node, 'new-share', userAccount);
		share.permission = SharePermission.ReadAndShare;
		const mocks = {
			Query: {
				getAccountByEmail: mockGetAccountByEmail(userAccount)
			}
		} satisfies Partial<Resolvers>;
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
				populateGalContact(userAccount.full_name, userAccount.email),
				populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
			]
		});
		// write getNode in cache since it is used to establish permissions
		global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
			query: GetNodeDocument,
			variables: getNodeVariables(node.id),
			data: {
				getNode: node
			}
		});

		const { user } = setup(<AddSharing node={node} />, {
			mocks,
			initialRouterEntries: [`/?node=${node.id}`]
		});
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await user.click(await screen.findByText(userAccount.email));
		// chip is created
		const chip = await screen.findByTestId(SELECTORS.chipWithPopover);
		// click on chip to open popover
		await user.click(screen.getByTestId(ICON_REGEXP.shareCanRead));
		await screen.findByText(/viewer/i);
		// advance timers to make the popover register listeners
		jest.advanceTimersToNextTimer();
		// click on editor shouldn't do anything
		await user.click(screen.getByText(/editor/i));
		// click on share should set share permissions
		await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
		// chip is updated
		expect(await within(chip).findByTestId(ICON_REGEXP.shareCanShare)).toBeVisible();
		expect(within(chip).queryByTestId(ICON_REGEXP.shareCanWrite)).not.toBeInTheDocument();
	});

	test('when user click on share button shares are created, chip input is cleared and shared button is disabled', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		const share = populateShare(node, 'new-share', userAccount);
		share.permission = SharePermission.ReadOnly;
		const mocks = {
			Query: {
				getAccountByEmail: mockGetAccountByEmail(userAccount)
			},
			Mutation: {
				createShare: jest.fn(mockCreateShare(share) as (...args: unknown[]) => Share)
			}
		} satisfies Partial<Resolvers>;
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
				populateGalContact(userAccount.full_name, userAccount.email),
				populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
			]
		});

		const { user } = setup(<AddSharing node={node} />, { mocks });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await user.click(await screen.findByText(userAccount.email));
		// chip is created
		await screen.findByTestId(SELECTORS.chipWithPopover);
		expect(screen.getByRole('button', { name: /share/i })).toBeEnabled();
		await user.click(screen.getByRole('button', { name: /share/i }));
		// create share mutation callback is called only if variables are an exact match
		await waitFor(() => expect(mocks.Mutation.createShare).toHaveBeenCalled());
		expect(screen.queryByText(userAccount.full_name[0])).not.toBeInTheDocument();
		expect(screen.queryByText(userAccount.full_name)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.shareCanRead)).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
	});

	test('share button is enabled only when a valid new share chip is created', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		const share = populateShare(node, 'new-share', userAccount);
		share.permission = SharePermission.ReadOnly;
		const mocks = {
			Query: {
				getAccountByEmail: mockGetAccountByEmail(userAccount)
			}
		} satisfies Partial<Resolvers>;
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
				populateGalContact(userAccount.full_name, userAccount.email),
				populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
			]
		});

		const { user } = setup(<AddSharing node={node} />, { mocks });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		// share button is disabled
		expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await user.click(await screen.findByText(userAccount.email));
		// chip is created
		await screen.findByTestId(SELECTORS.chipWithPopover);
		// share button is now active
		expect(screen.getByRole('button', { name: /share/i })).toBeEnabled();
	});

	test('if no valid account is found chip is not added and share button remains disabled', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		// force error
		const error = generateError('account not found');
		const mocks = {
			Query: {
				getAccountByEmail: mockErrorResolver(error)
			}
		} satisfies Partial<Resolvers>;
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
				populateGalContact(userAccount.full_name, userAccount.email),
				populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
			]
		});

		const { user } = setup(<AddSharing node={node} />, { mocks });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		// share button is disabled
		expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await user.click(await screen.findByText(userAccount.email));
		await screen.findByText(/Account not found/i);
		// chip is not created
		expect(screen.queryByTestId(SELECTORS.chipWithPopover)).not.toBeInTheDocument();
		// dropdown is closed
		expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
		// share button is still disabled
		expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
	});

	test('multiple shares are creatable at once. Popover changes permissions of the active share only', async () => {
		const node = populateNode();
		node.permissions.can_write_file = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_share = true;
		const userAccount1 = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount1.email = userAccount1.email.toLowerCase();
		const share1 = populateShare(node, 'new-share-1', userAccount1);
		share1.permission = SharePermission.ReadAndWrite;
		const userAccount2 = populateUser();
		userAccount2.email = userAccount2.email.toLowerCase();
		const share2 = populateShare(node, 'new-share-2', userAccount2);
		share2.permission = SharePermission.ReadAndShare;
		const mocks = {
			Query: {
				getAccountByEmail: mockGetAccountByEmail(userAccount1, userAccount2)
			}
		} satisfies Partial<Resolvers>;
		// mock soap fetch implementation for both the calls
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
					populateGalContact(userAccount2.full_name, userAccount2.email),
					populateGalContact(`${userAccount2.full_name[0]}-other-contact-2`)
				]
			});
		// write getNode in cache since it is used to establish permissions
		global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
			query: GetNodeDocument,
			variables: getNodeVariables(node.id),
			data: {
				getNode: node
			}
		});

		const { user } = setup(<AddSharing node={node} />, {
			mocks,
			initialRouterEntries: [`/?node=${node.id}`]
		});
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount1.full_name[0]);
		// wait for the dropdown to be shown
		await user.click(await screen.findByText(userAccount1.email));
		// chip is created
		const chip1 = await screen.findByTestId(SELECTORS.chipWithPopover);
		// create second chip
		await user.type(chipInput, userAccount2.full_name[0]);
		await user.click(await screen.findByText(userAccount2.email));
		// chip is created
		const chip2 = (await screen.findAllByTestId(SELECTORS.chipWithPopover)).find(
			(chip) => within(chip).queryByText(userAccount2.full_name) !== null
		) as HTMLElement;
		// edit first share to be an editor
		// click on chip to open popover
		await user.click(within(chip1).getByTestId(ICON_REGEXP.shareCanRead));
		await screen.findByText(/viewer/i);
		// advance timers to make the popover register listeners
		jest.advanceTimersToNextTimer();
		await user.click(screen.getByText(/editor/i));
		// wait for the chip to update replacing the viewer icon with the editor one
		// there are 2 editor icons because one is inside the popover
		expect(await within(chip1).findByTestId(ICON_REGEXP.shareCanWrite)).toBeVisible();
		expect(within(chip2).queryByTestId(ICON_REGEXP.shareCanWrite)).not.toBeInTheDocument();
		// edit second share to allow re-share
		await user.click(within(chip2).getByTestId(ICON_REGEXP.shareCanRead));
		// previous popover is closed and the one related to second share is opened
		await screen.findByText(/viewer/i);
		// advance timers to make the popover register listeners
		jest.advanceTimersToNextTimer();
		// select the share permission
		await user.click(screen.getByTestId(ICON_REGEXP.checkboxUnchecked));
		// chip is updated, only this chip has the share icon
		expect(await within(chip2).findByTestId(ICON_REGEXP.shareCanShare)).toBeVisible();
		expect(within(chip1).queryByTestId(ICON_REGEXP.shareCanShare)).not.toBeInTheDocument();
	});
});
