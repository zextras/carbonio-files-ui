/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';
import type { Action as DSAction } from '@zextras/carbonio-design-system';

import { setup } from '../../utils/testUtils';
import { NodeHoverBar } from './NodeHoverBar';

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
		expect(screen.getByTestId('icon: action1Icon')).toBeInTheDocument();
		expect(screen.getByTestId('icon: action1Icon')).toBeVisible();
		expect(screen.getByTestId('icon: action2Icon')).toBeInTheDocument();
		expect(screen.getByTestId('icon: action2Icon')).toBeVisible();
		await user.click(screen.getByTestId('icon: action1Icon'));
		expect(action1Fn).toHaveBeenCalledTimes(1);
		expect(action2Fn).not.toHaveBeenCalled();
		await user.click(screen.getByTestId('icon: action2Icon'));
		expect(action1Fn).toHaveBeenCalledTimes(1);
		expect(action2Fn).toHaveBeenCalledTimes(1);
	});
});
