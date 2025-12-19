/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { RawSoapResponse } from '@zextras/carbonio-ui-soap-lib';

import { TransferOwnershipModalContent } from './TransferOwnershipModalContent';
import * as network from '../../../network/network';
import { ICON_REGEXP } from '../../constants/test';
import { populateAutocompleteGalResult, populateFolder, populateNode } from '../../mocks/mockUtils';
import { setup, screen, UserEvent, generateError } from '../../tests/utils';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { AutocompleteGalResponse, ContactInfo } from '../../types/network';
import {
	mockErrorResolver,
	mockGetTransferOwnershipAvailability,
	mockGetTransferOwnershipAvailabilityLoading,
	mockTransferOwnership
} from '../../utils/resolverMocks';
import { getChipLabel } from '../../utils/utils';

let match: ContactInfo[] = [];

const spyAutoComplete = (): void => {
	match = [populateAutocompleteGalResult()];
	vi.spyOn(network, 'soapFetch').mockImplementation(
		(): Promise<RawSoapResponse<{ AutoCompleteGalResponse: AutocompleteGalResponse }>> =>
			Promise.resolve({
				Body: {
					AutoCompleteGalResponse: {
						cn: match
					}
				},
				Header: { context: {} }
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
		setup(<TransferOwnershipModalContent nodes={[node]} closeAction={vi.fn()} />);
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
			setup(<TransferOwnershipModalContent nodes={[populateNode()]} closeAction={vi.fn()} />);
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
				<TransferOwnershipModalContent nodes={[populateNode()]} closeAction={vi.fn()} />,
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
				<TransferOwnershipModalContent nodes={[populateNode()]} closeAction={vi.fn()} />,
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
				<TransferOwnershipModalContent nodes={[populateNode()]} closeAction={vi.fn()} />,
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
				<TransferOwnershipModalContent nodes={[populateNode()]} closeAction={vi.fn()} />,
				{
					mocks
				}
			);
			await selectNewOwner(user);
			expect(await screen.findByText(/An error occurred while fetching data/i)).toBeVisible();
		});
	});
	describe('Modal Title', () => {
		it('should display the correct title for a single node', () => {
			const node = populateNode();
			setup(<TransferOwnershipModalContent nodes={[node]} closeAction={vi.fn()} />);
			expect(screen.getByText(`Transfer Ownership of ${node.name}`)).toBeVisible();
		});
		it('should display the correct title for multiple nodes', () => {
			const nodes = [populateNode(), populateNode()];
			setup(<TransferOwnershipModalContent nodes={nodes} closeAction={vi.fn()} />);
			expect(screen.getByText(`Transfer Ownership of ${nodes.length} items`)).toBeVisible();
		});
	});
	it('should call closeAction when the modal is closed with footer cancel button', () => {
		const closeAction = vi.fn();
		setup(<TransferOwnershipModalContent nodes={[populateNode()]} closeAction={closeAction} />);
		const closeButton = screen.getByRole('button', { name: /cancel/i });
		closeButton.click();
		expect(closeAction).toHaveBeenCalledTimes(1);
	});
	it('should call closeAction when the modal is closed with the header close icon', () => {
		const closeAction = vi.fn();
		setup(<TransferOwnershipModalContent nodes={[populateNode()]} closeAction={closeAction} />);
		const closeIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.close });
		closeIcon.click();
		expect(closeAction).toHaveBeenCalledTimes(1);
	});
	it('should call transferOwnership mutation when confirm and mockGetTransferOwnershipAvailability is true ', async () => {
		spyAutoComplete();
		const node = populateNode();
		const mocks = {
			Query: {
				getTransferOwnershipAvailability: mockGetTransferOwnershipAvailability(true)
			},
			Mutation: {
				transferOwnership: vi.fn().mockReturnValue(vi.fn())
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<TransferOwnershipModalContent nodes={[node]} closeAction={vi.fn()} />, {
			mocks
		});
		await selectNewOwner(user);
		const transferButton = screen.getByRole('button', { name: /transfer/i });
		await user.click(transferButton);
		expect(mocks.Mutation.transferOwnership).toHaveBeenCalled();
	});
	it('should not call transferOwnership mutation when confirm and mockGetTransferOwnershipAvailability is false', async () => {
		spyAutoComplete();
		const node = populateNode();
		const mocks = {
			Query: {
				getTransferOwnershipAvailability: mockGetTransferOwnershipAvailability(false)
			},
			Mutation: {
				transferOwnership: vi.fn().mockReturnValue(vi.fn())
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<TransferOwnershipModalContent nodes={[node]} closeAction={vi.fn()} />, {
			mocks
		});
		await selectNewOwner(user);
		const transferButton = screen.getByRole('button', { name: /transfer/i });
		await user.click(transferButton);
		expect(mocks.Mutation.transferOwnership).not.toHaveBeenCalled();
	});
	it('should disable confirm button when no new owner is selected', async () => {
		const node = populateNode();
		setup(<TransferOwnershipModalContent nodes={[node]} closeAction={vi.fn()} />);
		const transferButton = screen.getByRole('button', { name: /transfer/i });
		expect(transferButton).toBeDisabled();
	});
	it('should disable confirm button when loading', async () => {
		spyAutoComplete();
		const node = populateNode();
		const mocks = {
			Query: {
				getTransferOwnershipAvailability: mockGetTransferOwnershipAvailabilityLoading()
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<TransferOwnershipModalContent nodes={[node]} closeAction={vi.fn()} />, {
			mocks
		});
		await selectNewOwner(user);
		const transferButton = screen.getByRole('button', { name: /transfer/i });
		expect(transferButton).toBeDisabled();
	});
	it('should enable confirm button when a new owner is selected and availability is true', async () => {
		spyAutoComplete();
		const node = populateNode();
		const mocks = {
			Query: {
				getTransferOwnershipAvailability: mockGetTransferOwnershipAvailability(true)
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<TransferOwnershipModalContent nodes={[node]} closeAction={vi.fn()} />, {
			mocks
		});
		await selectNewOwner(user);
		const transferButton = screen.getByRole('button', { name: /transfer/i });
		expect(transferButton).toBeEnabled();
	});
	it('should not enable confirm button when a new owner is selected and availability is false', async () => {
		spyAutoComplete();
		const node = populateNode();
		const mocks = {
			Query: {
				getTransferOwnershipAvailability: mockGetTransferOwnershipAvailability(false)
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<TransferOwnershipModalContent nodes={[node]} closeAction={vi.fn()} />, {
			mocks
		});
		await selectNewOwner(user);
		const transferButton = screen.getByRole('button', { name: /transfer/i });
		expect(transferButton).toBeDisabled();
	});
	it('should show a confirmation message when transferOwnership mutation is successful', async () => {
		spyAutoComplete();
		const node = populateNode();
		const mocks = {
			Query: {
				getTransferOwnershipAvailability: mockGetTransferOwnershipAvailability(true)
			},
			Mutation: {
				transferOwnership: mockTransferOwnership(populateFolder())
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<TransferOwnershipModalContent nodes={[node]} closeAction={vi.fn()} />, {
			mocks
		});
		await selectNewOwner(user);
		const transferButton = screen.getByRole('button', { name: /transfer/i });
		await user.click(transferButton);
		expect(await screen.findByText(/Ownership transferred successfully./i)).toBeVisible();
	});
	it('should show an error message when transferOwnership mutation fails with code OVER_QUOTA_REACHED', async () => {
		spyAutoComplete();
		const node = populateNode();
		const mocks = {
			Query: {
				getTransferOwnershipAvailability: mockGetTransferOwnershipAvailability(true)
			},
			Mutation: {
				transferOwnership: mockErrorResolver(
					generateError('transferOwnership error', { code: 'OVER_QUOTA_REACHED' })
				)
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<TransferOwnershipModalContent nodes={[node]} closeAction={vi.fn()} />, {
			mocks
		});
		await selectNewOwner(user);
		const transferButton = screen.getByRole('button', { name: /transfer/i });
		await user.click(transferButton);
		expect(await screen.findByText(/Ownership transfer failed./i)).toBeVisible();
		expect(
			await screen.findByText(/The new owner doesn’t have enough storage available./i)
		).toBeVisible();
	});
	it('should show an error message when transferOwnership mutation fails with a generic error', async () => {
		spyAutoComplete();
		const node = populateNode();
		const mocks = {
			Query: {
				getTransferOwnershipAvailability: mockGetTransferOwnershipAvailability(true)
			},
			Mutation: {
				transferOwnership: mockErrorResolver(generateError('transferOwnership error'))
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<TransferOwnershipModalContent nodes={[node]} closeAction={vi.fn()} />, {
			mocks
		});
		await selectNewOwner(user);
		const transferButton = screen.getByRole('button', { name: /transfer/i });
		await user.click(transferButton);
		expect(
			await screen.findByText(/Something went wrong while transferring ownership./i)
		).toBeVisible();
		expect(await screen.findByText(/Please try again./i)).toBeVisible();
	});
});
