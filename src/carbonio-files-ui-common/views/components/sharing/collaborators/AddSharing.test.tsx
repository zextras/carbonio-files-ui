/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { RawSoapResponse } from '@zextras/carbonio-ui-soap-lib';

import { AddSharing } from './AddSharing';
import * as network from '../../../../../network/network';
import { ICON_REGEXP, SELECTORS } from '../../../../constants/test';
import {
	populateGalContact,
	populateNode,
	populateShare,
	populateUser
} from '../../../../mocks/mockUtils';
import { generateError, screen, setup } from '../../../../tests/utils';
import { Resolvers } from '../../../../types/graphql/resolvers-types';
import {
	GetNodeDocument,
	GetNodeQuery,
	GetNodeQueryVariables,
	Share,
	SharePermission
} from '../../../../types/graphql/types';
import {
	getNodeVariables,
	mockCreateShare,
	mockErrorResolver,
	mockGetAccountByEmail
} from '../../../../utils/resolverMocks';

const mockedSoapFetch = vi.fn();

beforeEach(() => {
	vi.spyOn(network, 'soapFetch').mockImplementation(
		(args): Promise<RawSoapResponse<Record<string, unknown>>> =>
			new Promise<RawSoapResponse<Record<string, unknown>>>((resolve, reject) => {
				const result = mockedSoapFetch(args);
				result
					? resolve({ Body: result, Header: { context: {} } })
					: reject(new Error('no result provided'));
			})
	);
});

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
			AutoCompleteResponse: {
				match: [
					populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
					populateGalContact(userAccount.full_name, userAccount.email),
					populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
				]
			}
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
		await screen.findByTestId(SELECTORS.chip);
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
			AutoCompleteResponse: {
				match: [
					populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
					populateGalContact(userAccount.full_name, userAccount.email),
					populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
				]
			}
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
			AutoCompleteResponse: {
				match: [
					populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
					populateGalContact(userAccount.full_name, userAccount.email),
					populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
				]
			}
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
			AutoCompleteResponse: {
				match: [
					populateGalContact('contact-1', 'contact1@example.com'),
					populateGalContact('contact-2', 'contactsamemail@example.com'),
					populateGalContact('contact-3', 'contactsamemail@example.com'),
					populateGalContact('contact-4', 'contact4@example.com')
				]
			}
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
			AutoCompleteResponse: {
				match: [
					populateGalContact('contact-1', 'contact1@example.com'),
					populateGalContact('contact-2', 'contact2@example.com'),
					populateGalContact('contact-3', 'contact3@example.com')
				]
			}
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
			AutoCompleteResponse: {
				match: [
					populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
					populateGalContact(userAccount.full_name, userAccount.email),
					populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
				]
			}
		});

		const { user } = setup(<AddSharing node={node} />, { mocks });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await user.click(await screen.findByText(userAccount.email));
		// chip is created
		const chip = await screen.findByTestId(SELECTORS.chip);
		expect(chip).toBeVisible();
		expect(screen.getByRole('button', { name: /share/i })).toBeEnabled();
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
			AutoCompleteResponse: {
				match: [
					populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
					populateGalContact(userAccount.full_name, userAccount.email),
					populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
				]
			}
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
		await screen.findByTestId(SELECTORS.chip);
		await user.click(screen.getByRole('button', { name: /viewer/i }));
		// advance timers to make the popover register listeners
		vi.advanceTimersToNextTimer();
		await user.hover(screen.getByText(/editor/i));
		await screen.findByText("You don't have the necessary permissions to assign editor rights.");
		// click on share should set share permissions
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
				createShare: vi.fn(mockCreateShare(share) as (...args: unknown[]) => Share)
			}
		} satisfies Partial<Resolvers>;
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

		const { user } = setup(<AddSharing node={node} />, { mocks });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await user.click(await screen.findByText(userAccount.email));
		// chip is created
		await screen.findByTestId(SELECTORS.chip);
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
			AutoCompleteResponse: {
				match: [
					populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
					populateGalContact(userAccount.full_name, userAccount.email),
					populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
				]
			}
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
		await screen.findByTestId(SELECTORS.chip);
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
			AutoCompleteResponse: {
				match: [
					populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
					populateGalContact(userAccount.full_name, userAccount.email),
					populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
				]
			}
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
		expect(screen.queryByTestId(SELECTORS.chip)).not.toBeInTheDocument();
		// dropdown is closed
		expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
		// share button is still disabled
		expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
	});
});
