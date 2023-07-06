/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen } from '@testing-library/react';

import { SecondaryBarItem } from './SecondaryBarItem';
import { setup } from '../../utils/testUtils';

describe('SecondaryBarItem', () => {
	test('should render an upload badge with a fraction if expanded is true', () => {
		const item = {
			id: '1',
			completeTotalBadgeCounter: '1/1'
		};
		setup(<SecondaryBarItem item={item} expanded />);
		expect(screen.getByText(/1\/1/i)).toBeVisible();
	});

	test('should not render the upload badge if the completeTotalBadgeCounter is undefined', () => {
		const item = {
			id: '1',
			completeTotalBadgeCounter: undefined
		};
		setup(<SecondaryBarItem item={item} expanded />);
		expect(screen.queryByText(/0\/0/i)).not.toBeInTheDocument();
	});
});
