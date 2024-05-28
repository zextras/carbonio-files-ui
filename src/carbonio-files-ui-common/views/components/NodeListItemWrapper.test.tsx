/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';

import { NodeListItemWrapper } from './NodeListItemWrapper';
import { ICON_REGEXP } from '../../constants/test';
import { populateNode } from '../../mocks/mockUtils';
import { setup } from '../../tests/utils';

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
			expect(screen.queryByTestId(ICON_REGEXP.flagged)).not.toBeInTheDocument();
			await user.click(screen.getByTestId(ICON_REGEXP.flag));
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
			expect(screen.getByTestId(ICON_REGEXP.flagged)).toBeInTheDocument();
			expect(screen.getByTestId(ICON_REGEXP.flagged)).toBeVisible();
			await user.click(screen.getByTestId(ICON_REGEXP.unflag));
			expect(toggleFlag).toHaveBeenCalledTimes(1);
			expect(node.flagged).toBeFalsy();
		});
	});
});
