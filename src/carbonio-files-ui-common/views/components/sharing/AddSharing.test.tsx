/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { ApolloError } from '@apollo/client';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';

import {
	populateGalContact,
	populateNode,
	populateShare,
	populateUser
} from '../../../mocks/mockUtils';
import { GetNodeQuery, GetNodeQueryVariables, SharePermission } from '../../../types/graphql/types';
import {
	getNodeVariables,
	mockCreateShare,
	mockGetAccountByEmail,
	mockGetNode
} from '../../../utils/mockUtils';
import { generateError, setup } from '../../../utils/testUtils';
import { AddSharing } from './AddSharing';

const mockedSoapFetch: jest.Mock = jest.fn();

jest.mock('../../../../network/network', () => ({
	soapFetch: jest.fn(
		(): Promise<unknown> =>
			new Promise((resolve, reject) => {
				const result = mockedSoapFetch();
				result ? resolve(result) : reject(new Error('no result provided'));
			})
	)
}));

describe('Add Sharing', () => {
	test('contact already added as new share is not shown in dropdown', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		const mocks = [mockGetAccountByEmail({ email: userAccount.email }, userAccount)];
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
		expect(chipInput).toBeVisible();
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		expect(chipInput).toHaveValue(userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findByText(userAccount.email);
		expect(screen.getByText(userAccount.full_name)).toBeVisible();
		expect(screen.getByText(userAccount.email)).toBeVisible();
		await user.click(screen.getByText(userAccount.email));
		// dropdown is closed
		expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
		// chip is created
		await screen.findByText(userAccount.full_name);
		// now try to add a new share with the same email
		await user.type(chipInput, userAccount.full_name[0]);
		await waitFor(() => expect(chipInput).toHaveValue(userAccount.full_name[0]));
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
		const mocks = [mockGetAccountByEmail({ email: userAccount.email }, userAccount)];
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
		expect(chipInput).toBeVisible();
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		expect(chipInput).toHaveValue(userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findAllByText(/other-contact/i);
		// other contacts are visible
		expect(screen.getByText(`${userAccount.full_name[0]}-other-contact-1`)).toBeVisible();
		expect(screen.getByText(`${userAccount.full_name[0]}-other-contact-2`)).toBeVisible();
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

		const { user } = setup(<AddSharing node={node} />, { mocks: [] });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		expect(chipInput).toBeVisible();
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		expect(chipInput).toHaveValue(userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findAllByText(/other-contact/i);
		// other contacts are visible
		expect(screen.getByText(`${userAccount.full_name[0]}-other-contact-1`)).toBeVisible();
		expect(screen.getByText(`${userAccount.full_name[0]}-other-contact-2`)).toBeVisible();
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

		const { user } = setup(<AddSharing node={node} />, { mocks: [] });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		expect(chipInput).toBeVisible();
		await user.type(chipInput, 'c');
		expect(chipInput).toHaveValue('c');
		// wait for the dropdown to be shown
		await screen.findAllByText(/contact/i);
		expect(screen.getByText('contact1@example.com')).toBeVisible();
		// with the getBy query we assume there is just one entry
		expect(screen.getByText('contactsamemail@example.com')).toBeVisible();
		expect(screen.getByText('contact4@example.com')).toBeVisible();
		expect(screen.getAllByText(/contact-\d/)).toHaveLength(3);
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

		const { user } = setup(<AddSharing node={node} />, { mocks: [] });
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		expect(chipInput).toBeVisible();
		await user.type(chipInput, 'c');
		expect(chipInput).toHaveValue('c');
		// wait for the dropdown to be shown
		await screen.findAllByText(/contact/i);
		// dropdown contains 3 entries
		expect(screen.getAllByText(/contact-[1-3]/i)).toHaveLength(3);
		// delete input with backspace
		await user.type(chipInput, '{backspace}', { skipClick: true });
		await waitForElementToBeRemoved(screen.queryAllByText(/contact/i));
		expect(screen.queryByText('c')).not.toBeInTheDocument();
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
		const createShareMutationFn = jest.fn();
		const mocks = [
			mockGetAccountByEmail({ email: userAccount.email }, userAccount),
			mockCreateShare(
				{
					node_id: node.id,
					share_target_id: userAccount.id,
					permission: SharePermission.ReadOnly
				},
				share,
				createShareMutationFn
			)
		];
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
		expect(chipInput).toBeVisible();
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		expect(chipInput).toHaveValue(userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findByText(userAccount.email);
		expect(screen.getByText(userAccount.full_name)).toBeVisible();
		expect(screen.getByText(userAccount.email)).toBeVisible();
		await user.click(screen.getByText(userAccount.email));
		// dropdown is closed
		expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
		// chip is created
		await screen.findByText(userAccount.full_name);
		// chip is created with read-only permissions
		expect(screen.getByTestId('icon: EyeOutline')).toBeVisible();
		expect(screen.queryByTestId('icon: Edit2Outline')).not.toBeInTheDocument();
		expect(screen.queryByTestId('icon: Share')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /share/i })).not.toHaveAttribute('disabled');
		await user.click(screen.getByRole('button', { name: /share/i }));
		// create share mutation callback is called only if variables are an exact match
		await waitFor(() => expect(createShareMutationFn).toHaveBeenCalled());
	});

	test('when user click on a new share permissions icon button of the chip the popover is shown', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		const mocks = [mockGetAccountByEmail({ email: userAccount.email }, userAccount)];
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
		expect(chipInput).toBeVisible();
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		expect(chipInput).toHaveValue(userAccount.full_name[0]);
		// wait for the single character to be typed
		// await screen.findByText(userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findByText(userAccount.email);
		expect(screen.getByText(userAccount.full_name)).toBeVisible();
		expect(screen.getByText(userAccount.email)).toBeVisible();
		await user.click(screen.getByText(userAccount.email));
		// chip is created
		await screen.findByText(userAccount.full_name);
		// dropdown is closed
		expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
		await screen.findByText(userAccount.full_name);
		// click on the chip to open the popover
		await user.click(screen.getByTestId('icon: EyeOutline'));
		await screen.findByText(/viewer/i);
		// advance timers to make the popover register listeners
		jest.advanceTimersToNextTimer();
		expect(screen.getByText(/viewer/i)).toBeVisible();
		expect(screen.getByText(/editor/i)).toBeVisible();
		expect(screen.getByText(/sharing allowed/i)).toBeVisible();
		// click outside to close popover
		await user.click(screen.getByRole('textbox', { name: /add new people or groups/i }));
		expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/editor/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/sharing allowed/i)).not.toBeInTheDocument();
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
		const createShareMutationFn = jest.fn();
		const mocks = [
			mockGetAccountByEmail({ email: userAccount.email }, userAccount),
			mockCreateShare(
				{
					node_id: node.id,
					share_target_id: userAccount.id,
					permission: SharePermission.ReadWriteAndShare
				},
				share,
				createShareMutationFn
			)
		];
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
				populateGalContact(userAccount.full_name, userAccount.email),
				populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
			]
		});
		// write getNode in cache since it is used to establish permissions
		const mockedGetNodeQuery = mockGetNode(getNodeVariables(node.id), node);
		global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
			...mockedGetNodeQuery.request,
			data: {
				getNode: node
			}
		});

		const { user } = setup(<AddSharing node={node} />, {
			mocks,
			initialRouterEntries: [`/?node=${node.id}`]
		});
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		expect(chipInput).toBeVisible();
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		expect(chipInput).toHaveValue(userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findByText(userAccount.email);
		expect(screen.getByText(userAccount.full_name)).toBeVisible();
		expect(screen.getByText(userAccount.email)).toBeVisible();
		await user.click(screen.getByText(userAccount.email));
		// dropdown is closed
		expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
		// chip is created
		await screen.findByText(userAccount.full_name);
		// chip is created with read-only permissions
		expect(screen.getByTestId('icon: EyeOutline')).toBeVisible();
		expect(screen.queryByTestId('icon: Edit2Outline')).not.toBeInTheDocument();
		expect(screen.queryByTestId('icon: Share')).not.toBeInTheDocument();
		// click on chip to open popover
		await user.click(screen.getByTestId('icon: EyeOutline'));
		await screen.findByText(/viewer/i);
		// advance timers to make the popover register listeners
		jest.advanceTimersToNextTimer();
		expect(screen.getByText(/editor/i)).toBeVisible();
		expect(screen.getByText(/sharing allowed/i)).toBeVisible();
		expect(screen.getByTestId('icon: Square')).toBeVisible();
		expect(screen.getByTestId('exclusive-selection-editor')).not.toHaveAttribute('disabled');
		expect(screen.getByTestId('icon: Square')).not.toHaveAttribute('disabled');
		await user.click(screen.getByText(/editor/i));
		// wait for the chip to update replacing the viewer icon with the editor one
		// there are 2 editor icons because one is inside the popover
		await waitFor(() => expect(screen.getAllByTestId('icon: Edit2Outline')).toHaveLength(2));
		// just 1 viewer icon is shown, the one inside the popover
		expect(screen.getByTestId('icon: EyeOutline')).toBeVisible();
		// share permission is not selected yet
		expect(screen.queryByTestId('icon: Share')).not.toBeInTheDocument();
		// double check that the popover is kept open
		expect(screen.getByText(/viewer/i)).toBeVisible();
		// now select the share permission
		await user.click(screen.getByTestId('icon: Square'));
		await screen.findByTestId('icon: Share');
		// popover is still open so there are 2 editor icons (chip and popover), 1 viewer (popover) and 1 share (chip)
		expect(screen.getAllByTestId('icon: Edit2Outline')).toHaveLength(2);
		expect(screen.getByTestId('icon: EyeOutline')).toBeVisible();
		expect(screen.getByTestId('icon: Share')).toBeVisible();
		expect(screen.getByText(/viewer/i)).toBeVisible();
		// and sharing allowed is now checked inside the popover
		expect(screen.queryByTestId('icon: Square')).not.toBeInTheDocument();
		expect(screen.getByTestId('icon: CheckmarkSquare')).toBeVisible();
		// close popover
		await user.click(screen.getByRole('textbox', { name: /add new people or groups/i }));
		expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
		// now only the chip is shown, so we have 1 editor icon, 1 share and no viewer
		expect(screen.getByTestId('icon: Edit2Outline')).toBeVisible();
		expect(screen.getByTestId('icon: Share')).toBeVisible();
		expect(screen.queryByTestId('icon: EyeOutline')).not.toBeInTheDocument();
		// confirm add with share button
		await user.click(screen.getByRole('button', { name: /share/i }));
		await waitFor(() => expect(createShareMutationFn).toHaveBeenCalled());
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
		const createShareMutationFn = jest.fn();
		const mocks = [
			mockGetAccountByEmail({ email: userAccount.email }, userAccount),
			mockCreateShare(
				{
					node_id: node.id,
					share_target_id: userAccount.id,
					permission: SharePermission.ReadAndShare
				},
				share,
				createShareMutationFn
			)
		];
		// mock soap fetch implementation
		mockedSoapFetch.mockReturnValue({
			match: [
				populateGalContact(`${userAccount.full_name[0]}-other-contact-1`),
				populateGalContact(userAccount.full_name, userAccount.email),
				populateGalContact(`${userAccount.full_name[0]}-other-contact-2`)
			]
		});
		// write getNode in cache since it is used to establish permissions
		const mockedGetNodeQuery = mockGetNode(getNodeVariables(node.id), node);
		global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
			...mockedGetNodeQuery.request,
			data: {
				getNode: node
			}
		});

		const { user } = setup(<AddSharing node={node} />, {
			mocks,
			initialRouterEntries: [`/?node=${node.id}`]
		});
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		expect(chipInput).toBeVisible();
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		expect(chipInput).toHaveValue(userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findByText(userAccount.email);
		expect(screen.getByText(userAccount.full_name)).toBeVisible();
		expect(screen.getByText(userAccount.email)).toBeVisible();
		await user.click(screen.getByText(userAccount.email));
		// dropdown is closed
		expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
		// chip is created
		await screen.findByText(userAccount.full_name);
		// chip is created with read-only permissions
		expect(screen.getByTestId('icon: EyeOutline')).toBeVisible();
		expect(screen.queryByTestId('icon: Edit2Outline')).not.toBeInTheDocument();
		expect(screen.queryByTestId('icon: Share')).not.toBeInTheDocument();
		// click on chip to open popover
		await user.click(screen.getByTestId('icon: EyeOutline'));
		await screen.findByText(/viewer/i);
		// advance timers to make the popover register listeners
		jest.advanceTimersToNextTimer();
		expect(screen.getByText(/editor/i)).toBeVisible();
		expect(screen.getByText(/sharing allowed/i)).toBeVisible();
		expect(screen.getByTestId('icon: Square')).toBeVisible();
		expect(screen.getByTestId('icon: Square')).not.toHaveAttribute('disabled');
		// click on editor shouldn't do anything
		await user.click(screen.getByText(/editor/i));
		// click on share should set share permissions
		await user.click(screen.getByTestId('icon: Square'));
		// chip is updated
		await screen.findByTestId('icon: Share');
		// close popover
		await user.click(screen.getByRole('textbox', { name: /add new people or groups/i }));
		expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
		// chip has read and share permissions since click on editor did nothing
		expect(screen.getByTestId('icon: EyeOutline')).toBeVisible();
		expect(screen.getByTestId('icon: Share')).toBeVisible();
		await user.click(screen.getByRole('button', { name: /share/i }));
		await waitFor(() => expect(createShareMutationFn).toHaveBeenCalled());
	});

	test('when user click on share button shares are created, chip input and custom message textarea are cleared and shared button is disabled', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		const share = populateShare(node, 'new-share', userAccount);
		share.permission = SharePermission.ReadOnly;
		const createShareMutationFn = jest.fn();
		// const customMessage = 'this is a custom message';
		const mocks = [
			mockGetAccountByEmail({ email: userAccount.email }, userAccount),
			mockCreateShare(
				{
					node_id: node.id,
					share_target_id: userAccount.id,
					permission: SharePermission.ReadOnly
				},
				share,
				createShareMutationFn
			)
		];
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
		expect(chipInput).toBeVisible();
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		expect(chipInput).toHaveValue(userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findByText(userAccount.email);
		expect(screen.getByText(userAccount.full_name)).toBeVisible();
		expect(screen.getByText(userAccount.email)).toBeVisible();
		await user.click(screen.getByText(userAccount.email));
		// dropdown is closed
		expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
		// chip is created
		await screen.findByText(userAccount.full_name);
		// chip is created with read-only permissions
		expect(screen.getByTestId('icon: EyeOutline')).toBeVisible();
		expect(screen.queryByTestId('icon: Edit2Outline')).not.toBeInTheDocument();
		expect(screen.queryByTestId('icon: Share')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /share/i })).not.toHaveAttribute('disabled');
		// write a custom message
		// const customMessageInputField = screen.getByRole('textbox', {
		// 	name: /add a custom message to this notification/i
		// });
		// await user.type(customMessageInputField, customMessage);
		// expect(customMessageInputField).toHaveValue(customMessage);
		await user.click(screen.getByRole('button', { name: /share/i }));
		// create share mutation callback is called only if variables are an exact match
		await waitFor(() => expect(createShareMutationFn).toHaveBeenCalled());
		// expect(customMessageInputField).toHaveValue('');
		expect(screen.queryByText(userAccount.full_name[0])).not.toBeInTheDocument();
		expect(screen.queryByText(userAccount.full_name)).not.toBeInTheDocument();
		expect(screen.queryByTestId('icon: EyeOutline')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /share/i })).toHaveAttribute('disabled', '');
	});

	test('share button is enabled only when a valid new share chip is created', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		const share = populateShare(node, 'new-share', userAccount);
		share.permission = SharePermission.ReadOnly;
		const createShareMutationFn = jest.fn();
		// const customMessage = 'this is a custom message';
		const mocks = [
			mockGetAccountByEmail({ email: userAccount.email }, userAccount),
			mockCreateShare(
				{
					node_id: node.id,
					share_target_id: userAccount.id,
					permission: SharePermission.ReadOnly
				},
				share,
				createShareMutationFn
			)
		];
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
		expect(chipInput).toBeVisible();
		// share button is disabled
		expect(screen.getByRole('button', { name: /share/i })).toHaveAttribute('disabled', '');
		// write a custom message
		// const customMessageInputField = screen.getByRole('textbox', {
		// 	name: /add a custom message to this notification/i
		// });
		// await user.type(customMessageInputField, customMessage);
		// expect(customMessageInputField).toHaveValue(customMessage);
		// share button is still disabled
		expect(screen.getByRole('button', { name: /share/i })).toHaveAttribute('disabled', '');
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		expect(chipInput).toHaveValue(userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findByText(userAccount.email);
		expect(screen.getByText(userAccount.full_name)).toBeVisible();
		expect(screen.getByText(userAccount.email)).toBeVisible();
		await user.click(screen.getByText(userAccount.email));
		// dropdown is closed
		expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
		// chip is created
		await screen.findByText(userAccount.full_name);
		// share button is now active
		expect(screen.getByRole('button', { name: /share/i })).not.toHaveAttribute('disabled');

		await user.click(screen.getByRole('button', { name: /share/i }));
		// create share mutation callback is called only if variables are an exact match
		await waitFor(() => expect(createShareMutationFn).toHaveBeenCalled());
		// share button returns to be disabled after creation success
		expect(screen.getByRole('button', { name: /share/i })).toHaveAttribute('disabled', '');
	});

	test('if no valid account is found chip is not added and share button remains disabled', async () => {
		const node = populateNode();
		node.permissions.can_share = true;
		const userAccount = populateUser();
		// set email to lowercase to be compatible with the contacts regexp
		userAccount.email = userAccount.email.toLowerCase();
		// force error
		const error = generateError('account not found');
		const mocks = [
			mockGetAccountByEmail(
				{ email: userAccount.email },
				null,
				new ApolloError({ graphQLErrors: [error] })
			)
		];
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
		expect(chipInput).toBeVisible();
		// share button is disabled
		expect(screen.getByRole('button', { name: /share/i })).toHaveAttribute('disabled', '');
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount.full_name[0]);
		expect(chipInput).toHaveValue(userAccount.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findByText(userAccount.email);
		expect(screen.getByText(userAccount.full_name)).toBeVisible();
		expect(screen.getByText(userAccount.email)).toBeVisible();
		await user.click(screen.getByText(userAccount.email));
		await screen.findByText(/Account not found/i);
		// chip is not created
		expect(screen.queryByText(userAccount.full_name)).not.toBeInTheDocument();
		// dropdown is closed
		expect(screen.queryByText(userAccount.email)).not.toBeInTheDocument();
		// share button returns to be disabled after creation success
		expect(screen.getByRole('button', { name: /share/i })).toHaveAttribute('disabled', '');
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
		const createShareMutationFn = jest.fn();
		const mocks = [
			mockGetAccountByEmail({ email: userAccount1.email }, userAccount1),
			mockGetAccountByEmail({ email: userAccount2.email }, userAccount2),
			mockCreateShare(
				{
					node_id: node.id,
					share_target_id: userAccount1.id,
					permission: SharePermission.ReadAndWrite
				},
				share1,
				createShareMutationFn
			),
			mockCreateShare(
				{
					node_id: node.id,
					share_target_id: userAccount2.id,
					permission: SharePermission.ReadAndShare
				},
				share2,
				createShareMutationFn
			)
		];
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
		const mockedGetNodeQuery = mockGetNode(getNodeVariables(node.id), node);
		global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
			...mockedGetNodeQuery.request,
			data: {
				getNode: node
			}
		});

		const { user } = setup(<AddSharing node={node} />, {
			mocks,
			initialRouterEntries: [`/?node=${node.id}`]
		});
		const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
		expect(chipInput).toBeVisible();
		// type just the first character because the network search is requested only one time with first character.
		// All characters typed after the first one are just used to filter out the result obtained before
		await user.type(chipInput, userAccount1.full_name[0]);
		expect(chipInput).toHaveValue(userAccount1.full_name[0]);
		// wait for the dropdown to be shown
		await screen.findByText(userAccount1.email);
		expect(screen.getByText(userAccount1.full_name)).toBeVisible();
		expect(screen.getByText(userAccount1.email)).toBeVisible();
		await user.click(screen.getByText(userAccount1.email));
		// dropdown is closed
		expect(screen.queryByText(userAccount1.email)).not.toBeInTheDocument();
		// chip is created
		await screen.findByText(userAccount1.full_name);
		// chip is created with read-only permissions
		expect(screen.getByTestId('icon: EyeOutline')).toBeVisible();
		expect(screen.queryByTestId('icon: Edit2Outline')).not.toBeInTheDocument();
		expect(screen.queryByTestId('icon: Share')).not.toBeInTheDocument();
		// create second chip
		await user.type(chipInput, userAccount2.full_name[0]);
		await waitFor(() => expect(chipInput).toHaveValue(userAccount2.full_name[0]));
		await screen.findByText(userAccount2.email);
		expect(screen.getByText(userAccount2.full_name)).toBeVisible();
		await user.click(screen.getByText(userAccount2.full_name));
		// dropdown is closed
		expect(screen.queryByText(userAccount2.email)).not.toBeInTheDocument();
		// chip is created
		await screen.findByText(userAccount2.full_name);
		// chip is created with read-only permissions, so now we have 2 chips in read-only
		expect(screen.getAllByTestId('icon: EyeOutline')).toHaveLength(2);
		expect(screen.getAllByTestId('icon: Close')).toHaveLength(2);
		expect(screen.queryByTestId('icon: Edit2Outline')).not.toBeInTheDocument();
		expect(screen.queryByTestId('icon: Share')).not.toBeInTheDocument();

		// edit first share to be an editor
		// click on chip to open popover
		await user.click(screen.getAllByTestId('icon: EyeOutline')[0]);
		await screen.findByText(/viewer/i);
		// advance timers to make the popover register listeners
		jest.advanceTimersToNextTimer();
		expect(screen.getByText(/editor/i)).toBeVisible();
		expect(screen.getByTestId('exclusive-selection-editor')).not.toHaveAttribute('disabled');
		await user.click(screen.getByText(/editor/i));
		// wait for the chip to update replacing the viewer icon with the editor one
		// there are 2 editor icons because one is inside the popover
		await waitFor(() => expect(screen.getAllByTestId('icon: Edit2Outline')).toHaveLength(2));
		// click on chip to close popover
		await user.click(screen.getByText(userAccount1.full_name));
		expect(screen.getByTestId('icon: Edit2Outline')).toBeVisible();

		// edit second share to allow re-share
		await user.click(screen.getByTestId('icon: EyeOutline'));
		// previous popover is closed and the one related to second share is opened
		await screen.findByText(/viewer/i);
		// advance timers to make the popover register listeners
		jest.advanceTimersToNextTimer();
		// select the share permission
		await user.click(screen.getByTestId('icon: Square'));
		// chip is updated, only this chip has the share icon
		await screen.findByTestId('icon: Share');
		// close popover
		await user.click(screen.getByRole('textbox', { name: /add new people or groups/i }));
		expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();

		// now we have 2 chips, one with editor role and one with viewer with sharing role
		expect(screen.getAllByTestId('icon: Close')).toHaveLength(2);
		expect(screen.getByTestId('icon: Edit2Outline')).toBeVisible();
		expect(screen.getByTestId('icon: EyeOutline')).toBeVisible();
		expect(screen.getByTestId('icon: Share')).toBeVisible();

		// confirm add with share button
		await user.click(screen.getByRole('button', { name: /share/i }));
		await waitFor(() => expect(createShareMutationFn).toHaveBeenCalled());
		// mutation is called 2 times, one for each new collaborator
		expect(createShareMutationFn).toHaveBeenCalledTimes(2);
	});
});
