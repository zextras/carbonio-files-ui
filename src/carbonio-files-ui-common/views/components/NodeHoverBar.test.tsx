/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import type { Action as DSAction } from '@zextras/carbonio-design-system';

import { NodeHoverBar } from './NodeHoverBar';
import { setup, screen } from '../../utils/testUtils';

describe('Node Hover Bar', () => {
	test('render nothing if no actions are provided', () => {
		setup(<NodeHoverBar actions={[]} />);
		expect(screen.queryByTestId(/icon:/i)).not.toBeInTheDocument();
	});

	test('render all actions icons', async () => {
		const action1Fn = jest.fn();
		const action2Fn = jest.fn();

		const actions: DSAction[] = [
			{
				id: 'action1',
				label: 'action1',
				icon: 'action1Icon',
				onClick: action1Fn
			},
			{
				id: 'action2',
				label: 'action2',
				icon: 'action2Icon',
				onClick: action2Fn
			}
		];

		const { user } = setup(<NodeHoverBar style={{ display: 'flex' }} actions={actions} />);
		const action1 = screen.getByRoleWithIcon('button', { icon: 'icon: action1Icon' });
		const action2 = screen.getByRoleWithIcon('button', { icon: 'icon: action2Icon' });
		expect(action1).toBeVisible();
		expect(action2).toBeVisible();
		await user.click(action1);
		expect(action1Fn).toHaveBeenCalledTimes(1);
		expect(action2Fn).not.toHaveBeenCalled();
		await user.click(action2);
		expect(action1Fn).toHaveBeenCalledTimes(1);
		expect(action2Fn).toHaveBeenCalledTimes(1);
	});
});
