/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen, waitFor, within } from '@testing-library/react';
import { forEach, find, reduce } from 'lodash';

import { AddSharing } from './AddSharing';
import * as actualNetworkModule from '../../../../network/network';
import { ICON_REGEXP, SELECTORS } from '../../../constants/test';
import {
	populateGalContact,
	populateContactGroupMatch,
	populateNode,
	populateContactGroup,
	populateUser,
	populateMembers,
	populateShare
} from '../../../mocks/mockUtils';
import { setup } from '../../../tests/utils';
import { Resolvers } from '../../../types/graphql/resolvers-types';
import { User } from '../../../types/graphql/types';
import {
	AutocompleteResponse,
	DerefMember,
	GetContactsResponse,
	Member
} from '../../../types/network';
import { mockGetAccountsByEmail } from '../../../utils/resolverMocks';
import { getChipLabel } from '../../../utils/utils';

let mockedSoapFetch = jest.fn();

beforeEach(() => {
	mockedSoapFetch = jest.fn();
});

jest.mock<typeof import('../../../../network/network')>('../../../../network/network', () => ({
	soapFetch: <Req, Res extends Record<string, unknown>>(
		...args: Parameters<typeof actualNetworkModule.soapFetch<Req, Res>>
	): ReturnType<typeof actualNetworkModule.soapFetch<Req, Res>> =>
		new Promise<Res>((resolve, reject) => {
			const result = mockedSoapFetch(...args);
			result ? resolve(result) : reject(new Error('no result provided'));
		})
}));

describe('Add Sharing', () => {
	describe('Contact Group', () => {
		test('Contact groups are shown in dropdown with only the name', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			// mock soap fetch implementation
			mockedSoapFetch.mockReturnValue({
				match: [
					populateGalContact('gal-contact-1'),
					populateContactGroupMatch('contact-group-1'),
					populateGalContact('gal-contact-2')
				]
			});

			const { user } = setup(<AddSharing node={node} />, { mocks: {} });
			const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
			expect(chipInput).toBeVisible();
			await user.type(chipInput, 'c');
			// wait for the single character to be typed
			await waitFor(() => expect(chipInput).toHaveDisplayValue('c'));
			// wait for the dropdown to be shown
			await screen.findByText(/contact-group-1/i);
			expect(screen.getAllByText(/gal-contact-\d$/i)).toHaveLength(2);
			expect(screen.getByText(/contact-group-1/i)).toBeVisible();
		});

		test('When user click on a contact group, members of the group are exploded in multiple chips, one per member', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			// mock soap fetch implementation
			const contactGroupMatch = populateContactGroupMatch('contact-group-1');
			const contactGroup = populateContactGroup(contactGroupMatch);
			mockedSoapFetch.mockImplementation((req) => {
				if (req === 'AutoComplete') {
					const res: AutocompleteResponse = {
						match: [contactGroupMatch]
					};
					return res;
				}
				if (req === 'GetContacts') {
					const res: GetContactsResponse = {
						cn: [contactGroup]
					};
					return res;
				}
				return undefined;
			});

			const [contactsNoGalAccounts, contactsGal] = reduce<Member, [User[], DerefMember[]]>(
				contactGroup.m,
				(acc, member) => {
					if (member.type !== 'G') {
						const email = (member.cn && member.cn[0]._attrs?.email) || member.value;
						acc[0].push(
							populateUser(
								(member.cn && member.cn[0]._attrs?.zimbraId) || undefined,
								(member.cn && member.cn[0]._attrs?.fullName) || undefined,
								email
							)
						);
					} else {
						acc[1].push(member as DerefMember);
					}
					return acc;
				},
				[[], []]
			);

			const mocks = {
				Query: {
					getAccountsByEmail: mockGetAccountsByEmail(contactsNoGalAccounts)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<AddSharing node={node} />, { mocks });
			const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
			expect(chipInput).toBeVisible();
			await user.type(chipInput, 'c');
			// wait for the dropdown to be shown
			await screen.findByText(/contact-group-1/i);
			await user.click(screen.getByText(/contact-group-1/i));
			await screen.findAllByTestId(SELECTORS.chipWithPopover);
			await waitFor(() =>
				expect(screen.getAllByTestId(SELECTORS.chipWithPopover)).toHaveLength(
					contactGroup.m?.length || 0
				)
			);
			await waitFor(() => expect(screen.getByRole('button', { name: /share/i })).toBeEnabled());
			// dropdown is closed
			expect(screen.queryByText(/contact-group-1/i)).not.toBeInTheDocument();
			// contact group members are exploded in different chips
			forEach(contactsNoGalAccounts, (contact) => {
				expect(screen.getByText(getChipLabel(contact))).toBeVisible();
			});
			forEach(contactsGal, (contact) => {
				expect(screen.getByText(contact.cn[0]._attrs.email)).toBeVisible();
			});
		});

		test('When a contact group contains one or more invalid members, they are added as error chips', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			// mock soap fetch implementation
			const contactGroupMatch = populateContactGroupMatch('contact-group-1');
			const contactGroup = populateContactGroup(contactGroupMatch, 0);
			const invalidMembers = populateMembers('I', 2);
			const validMembers = populateMembers('G', 2) as DerefMember[];
			contactGroup.m = [...invalidMembers, ...validMembers];
			mockedSoapFetch.mockImplementation((req) => {
				if (req === 'AutoComplete') {
					const res: AutocompleteResponse = {
						match: [contactGroupMatch]
					};
					return res;
				}
				if (req === 'GetContacts') {
					const res: GetContactsResponse = {
						cn: [contactGroup]
					};
					return res;
				}
				return undefined;
			});

			const mocks = {
				Query: {
					getAccountsByEmail: mockGetAccountsByEmail(
						// return array of null to indicate emails are not associated to any account
						new Array(invalidMembers.length).fill(null)
					)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(<AddSharing node={node} />, { mocks });
			const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
			expect(chipInput).toBeVisible();
			await user.type(chipInput, 'c');
			// wait for the dropdown to be shown
			await screen.findByText(/contact-group-1/i);
			expect(screen.getByText(/contact-group-1/i)).toBeVisible();
			const contactGroupDropdownItem = screen.getByText(/contact-group-1/i);
			await user.click(contactGroupDropdownItem);
			await screen.findAllByTestId(SELECTORS.chipWithPopover);
			await waitFor(() =>
				expect(screen.getAllByTestId(SELECTORS.chipWithPopover)).toHaveLength(
					invalidMembers.length + validMembers.length
				)
			);

			// dropdown is closed
			expect(screen.queryByText(/contact-group-1/i)).not.toBeInTheDocument();
			// contact group members are exploded in different chips
			// invalid emails are visible but in error status
			forEach(invalidMembers, (contact) => {
				expect(screen.getByText(contact.value)).toBeVisible();
			});
			forEach(validMembers, (contact) => {
				expect(screen.getByText(contact.cn[0]._attrs.email)).toBeVisible();
			});
			// share button is disabled
			expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
		});

		test('When a member is already set as collaborator, chip is not created', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			// mock soap fetch implementation
			const contactGroupMatch = populateContactGroupMatch('contact-group-1');
			const contactGroup = populateContactGroup(contactGroupMatch, 0);
			const members = populateMembers('G', 2) as DerefMember[];
			contactGroup.m = members;
			const memberUser = populateUser(
				members[0].cn[0]._attrs.zimbraId,
				members[0].cn[0]._attrs.fullName,
				members[0].cn[0]._attrs.email
			);
			node.shares = [populateShare(node, 'shareMember', memberUser)];
			mockedSoapFetch.mockImplementation((req) => {
				if (req === 'AutoComplete') {
					const res: AutocompleteResponse = {
						match: [contactGroupMatch]
					};
					return res;
				}
				if (req === 'GetContacts') {
					const res: GetContactsResponse = {
						cn: [contactGroup]
					};
					return res;
				}
				return undefined;
			});

			const { user } = setup(<AddSharing node={node} />, { mocks: {} });
			const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
			expect(chipInput).toBeVisible();
			await user.type(chipInput, 'c');
			// wait for the dropdown to be shown
			await screen.findAllByText(/contact/i);
			expect(screen.getByText(/contact-group-1/i)).toBeVisible();
			await user.click(screen.getByText(/contact-group-1/i));
			await screen.findByText(members[1].cn[0]._attrs.email);
			// dropdown is closed
			expect(screen.queryByText(/contact-group-1/i)).not.toBeInTheDocument();
			// only contact group member not already in a share is add as chip
			expect(screen.getByText(members[1].cn[0]._attrs.email)).toBeVisible();
			expect(screen.queryByText(members[0].cn[0]._attrs.email)).not.toBeInTheDocument();
		});

		test('When a member is already set as new share, chip is not created', async () => {
			const node = populateNode();
			node.permissions.can_share = true;
			// mock soap fetch implementation
			const contactGroupMatch = populateContactGroupMatch('contact-group-1');
			const contactGroup = populateContactGroup(contactGroupMatch, 0);
			const members = populateMembers('G', 2) as DerefMember[];
			contactGroup.m = members;
			mockedSoapFetch.mockImplementation((req) => {
				if (req === 'AutoComplete') {
					const res: AutocompleteResponse = {
						match: [contactGroupMatch]
					};
					return res;
				}
				if (req === 'GetContacts') {
					const res: GetContactsResponse = {
						cn: [contactGroup]
					};
					return res;
				}
				return undefined;
			});

			const { user } = setup(<AddSharing node={node} />, { mocks: {} });
			const chipInput = screen.getByRole('textbox', { name: /add new people or groups/i });
			expect(chipInput).toBeVisible();
			await user.type(chipInput, 'c');
			// wait for the dropdown to be shown
			await screen.findByText(/contact-group-1/i);
			expect(screen.getByText(/contact-group-1/i)).toBeVisible();
			await user.click(screen.getByText(/contact-group-1/i));
			await screen.findByText(members[0].cn[0]._attrs.email);
			// dropdown is closed
			expect(screen.queryByText(/contact-group-1/i)).not.toBeInTheDocument();
			// both contact group members are visible
			expect(screen.getByText(members[0].cn[0]._attrs.email)).toBeVisible();
			expect(screen.getByText(members[1].cn[0]._attrs.email)).toBeVisible();
			// delete chip of one of the members
			const chipItems = screen.getAllByTestId(SELECTORS.chipWithPopover);
			const member0Chip = find(
				chipItems,
				(chipItem) => within(chipItem).queryByText(members[0].cn[0]._attrs.email) !== null
			);
			expect(member0Chip).toBeDefined();
			const removeShareMember0 = within(member0Chip as HTMLElement).getByTestId(ICON_REGEXP.close);
			await user.click(removeShareMember0);
			expect(screen.queryByText(members[0].cn[0]._attrs.email)).not.toBeInTheDocument();
			expect(screen.getByText(members[1].cn[0]._attrs.email)).toBeVisible();
			// search and select contact group again
			await user.type(chipInput, 'c');
			// wait for the dropdown to be shown
			await screen.findByText(/contact-group-1/i);
			expect(screen.getByText(/contact-group-1/i)).toBeVisible();
			await user.click(screen.getByText(/contact-group-1/i));
			await screen.findByText(members[0].cn[0]._attrs.email);
			// dropdown is closed
			expect(screen.queryByText(/contact-group-1/i)).not.toBeInTheDocument();
			// both contact group members are visible, only 1 chip per member
			expect(screen.getByText(members[0].cn[0]._attrs.email)).toBeVisible();
			expect(screen.getByText(members[1].cn[0]._attrs.email)).toBeVisible();
		});
	});
});
