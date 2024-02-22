/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { FilesQuota } from './FilesQuota';
import { SELECTORS } from '../../carbonio-files-ui-common/constants/test';
import { screen, setup } from '../../carbonio-files-ui-common/utils/testUtils';

describe('Files Quota', () => {
	it('should show files quota when request return successfully', async () => {
		setup(<FilesQuota />);
		expect(await screen.findByTestId(SELECTORS.filesQuota)).toBeVisible();
	});
});

// TODO testare che se received e' true i dati sono gia' disponibili
