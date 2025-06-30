/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { TransferOwnershipModalContent } from './TransferOwnershipModalContent';
import { populateNode } from '../../mocks/mockUtils';
import { setup, screen } from '../../tests/utils';

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
});
