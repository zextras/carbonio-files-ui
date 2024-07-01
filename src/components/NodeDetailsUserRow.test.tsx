/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import * as shell from '@zextras/carbonio-shell-ui';

import { NodeDetailsUserRow } from './NodeDetailsUserRow';
import { populateFile, populateUser } from '../carbonio-files-ui-common/mocks/mockUtils';
import { screen, setup } from '../carbonio-files-ui-common/tests/utils';

describe('Node Details User Row', () => {
	it('should open the composer with the email when click on the email', async () => {
		const integratedFunction = jest.fn();
		jest.spyOn(shell, 'getIntegratedFunction').mockReturnValue([integratedFunction, true]);
		const node = populateFile();
		node.last_editor = populateUser();
		const { user } = setup(<NodeDetailsUserRow user={node.owner} label={faker.string.alpha(10)} />);
		expect(screen.getByText(node.owner.email)).toBeVisible();
		await user.click(screen.getByText(node.owner.email));
		expect(integratedFunction).toHaveBeenCalledWith({
			recipients: [
				{
					type: 't',
					address: node.owner.email
				}
			]
		});
	});
});
