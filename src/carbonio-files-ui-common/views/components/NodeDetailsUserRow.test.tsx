/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';

import { populateFile, populateUser } from '../../mocks/mockUtils';
import { setup } from '../../utils/testUtils';
import { NodeDetailsUserRow } from './NodeDetailsUserRow';

describe('Node Details User Row', () => {
	test('click on email call clickAction', async () => {
		const node = populateFile();
		const clickActionMock = jest.fn();
		node.last_editor = populateUser();
		const label = 'Created by';
		const { user } = setup(
			<NodeDetailsUserRow
				user={node.owner}
				label={label}
				dateTime={node.created_at}
				tooltip={'Action tooltip'}
				clickAction={clickActionMock}
			/>,
			{ mocks: [] }
		);
		expect(screen.getByText(node.owner.email)).toBeVisible();
		await user.click(screen.getByText(node.owner.email));
		const labelElement = screen.getByText(label);
		expect(labelElement).toBeVisible();
		expect(clickActionMock).toBeCalled();
	});
});
