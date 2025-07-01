/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { TransferOwnershipModalContent } from './TransferOwnershipModalContent';
import * as network from '../../../network/network';
import { populateAutocompleteGalResult, populateNode } from '../../mocks/mockUtils';
import { setup, screen, UserEvent, generateError } from '../../tests/utils';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { AutocompleteGalResponse, ContactInfo } from '../../types/network';
import {
	mockErrorResolver,
	mockGetTransferOwnershipAvailability,
	mockGetTransferOwnershipAvailabilityLoading
} from '../../utils/resolverMocks';
import { getChipLabel } from '../../utils/utils';

let match: ContactInfo[] = [];

const spyAutoComplete = (): void => {
	match = [populateAutocompleteGalResult()];
	jest.spyOn(network, 'soapFetch').mockImplementation(
		(): Promise<AutocompleteGalResponse> =>
			Promise.resolve({
				cn: match
			})
	);
};

const selectNewOwner = async (userEvent: UserEvent): Promise<void> => {
	const input = screen.getByPlaceholderText(/select a new owner/i);
	await userEvent.type(input, 'user');
	const suggestion = await screen.findByText(getChipLabel(match[0]._attrs));
	await userEvent.click(suggestion);
};

describe('TransferOwnershipModalContent', () => {
	it('should render without crashing', () => {
		const node = populateNode();
		setup(<TransferOwnershipModalContent nodes={[node]} closeAction={jest.fn()} />);
		expect(screen.getByText(`Transfer Ownership of ${node.name}`)).toBeVisible();
		expect(screen.getByText('Select a new owner for the selected items.')).toBeVisible();

		expect(screen.getByText('After the transfer:')).toBeVisible();
		expect(
			screen.getByTextWithMarkup('You’ll remain as a collaborator with editing and sharing rights.')
		).toBeVisible();
		expect(screen.getByText('All sharing settings will be kept.')).toBeVisible();
		expect(screen.getByTextWithMarkup('The new owner will be notified.')).toBeVisible();
		expect(screen.getByText('Please note:')).toBeVisible();
		expect(
			screen.getByText('If the new owner exceeds their storage quota, the transfer will fail.')
		).toBeVisible();
		expect(screen.getByText('This action is permanent and cannot be undone.')).toBeVisible();
	});
	describe('InputDescription', () => {
		it('shows nothing if no owner is selected', () => {
			setup(<TransferOwnershipModalContent nodes={[populateNode()]} closeAction={jest.fn()} />);
			expect(screen.queryByText(/Checking the new owner’s storage quota/i)).not.toBeInTheDocument();
			expect(
				screen.queryByText(/The new owner doesn’t have enough storage available/i)
			).not.toBeInTheDocument();
			expect(
				screen.queryByText(/The new owner has enough storage available/i)
			).not.toBeInTheDocument();
		});

		it('shows loading message when loading', async () => {
			spyAutoComplete();
			const mocks = {
				Query: {
					getTransferOwnershipAvailability: mockGetTransferOwnershipAvailabilityLoading()
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<TransferOwnershipModalContent nodes={[populateNode()]} closeAction={jest.fn()} />,
				{ mocks }
			);
			await selectNewOwner(user);
			expect(await screen.findByText(/Checking the new owner’s storage quota/i)).toBeVisible();
		});

		it('show The new owner has enough storage available if availability is true', async () => {
			spyAutoComplete();
			const mocks = {
				Query: {
					getTransferOwnershipAvailability: mockGetTransferOwnershipAvailability(true)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<TransferOwnershipModalContent nodes={[populateNode()]} closeAction={jest.fn()} />,
				{
					mocks
				}
			);
			await selectNewOwner(user);
			expect(screen.getByText(/The new owner has enough storage available/i)).toBeVisible();
		});

		it('show The new owner doesn’t have enough storage available if availability is false', async () => {
			spyAutoComplete();
			const mocks = {
				Query: {
					getTransferOwnershipAvailability: mockGetTransferOwnershipAvailability(false)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<TransferOwnershipModalContent nodes={[populateNode()]} closeAction={jest.fn()} />,
				{
					mocks
				}
			);
			await selectNewOwner(user);
			expect(
				screen.getByText(/The new owner doesn’t have enough storage available/i)
			).toBeVisible();
		});

		it('shows An error occurred while fetching data if there is an error', async () => {
			spyAutoComplete();
			const mocks = {
				Query: {
					getTransferOwnershipAvailability: mockErrorResolver(
						generateError('getTransferOwnershipAvailability error')
					)
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<TransferOwnershipModalContent nodes={[populateNode()]} closeAction={jest.fn()} />,
				{
					mocks
				}
			);
			await selectNewOwner(user);
			expect(await screen.findByText(/An error occurred while fetching data/i)).toBeVisible();
		});
	});
});
