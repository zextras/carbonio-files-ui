/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';

import { populateNode } from '../../mocks/mockUtils';
import { setup } from '../../utils/testUtils';
import { NodeListItemWrapper } from './NodeListItemWrapper';

describe('NodeListItemWrapper', () => {
	describe('hover actions', () => {
		test('click on flag action changes flag icon visibility', async () => {
			const node = populateNode();
			node.flagged = false;

			const toggleFlag = jest.fn((value, item) => {
				if (item.id === node.id) {
					node.flagged = value;
				}
			});

			const { user } = setup(<NodeListItemWrapper node={node} toggleFlag={toggleFlag} />);
			expect(screen.queryByTestId('icon: Flag')).not.toBeInTheDocument();
			await user.click(screen.getByTestId('icon: FlagOutline'));
			expect(toggleFlag).toHaveBeenCalledTimes(1);
			expect(node.flagged).toBeTruthy();
		});

		test('click on unflag action changes flag icon visibility', async () => {
			const node = populateNode();
			node.flagged = true;

			const toggleFlag = jest.fn((value, item) => {
				if (item.id === node.id) {
					node.flagged = value;
				}
			});

			const { user } = setup(<NodeListItemWrapper node={node} toggleFlag={toggleFlag} />);
			expect(screen.getByTestId('icon: Flag')).toBeInTheDocument();
			expect(screen.getByTestId('icon: Flag')).toBeVisible();
			await user.click(screen.getByTestId('icon: UnflagOutline'));
			expect(toggleFlag).toHaveBeenCalledTimes(1);
			expect(node.flagged).toBeFalsy();
		});
	});
});
