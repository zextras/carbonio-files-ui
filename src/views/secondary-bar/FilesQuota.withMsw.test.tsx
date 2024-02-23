/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { waitFor } from '@testing-library/react';
import { rest } from 'msw';

import { FilesQuota } from './FilesQuota';
import { MYSELF_QUOTA_PATH, STORAGES_ENDPOINT } from '../../carbonio-files-ui-common/constants';
import { SELECTORS } from '../../carbonio-files-ui-common/constants/test';
import { screen, setup } from '../../carbonio-files-ui-common/utils/testUtils';
import * as useFilesQuotaInfo from '../../hooks/useFilesQuotaInfo';
import server from '../../mocks/server';

describe('Files Quota', () => {
	it('should show files quota when request return successfully', async () => {
		setup(<FilesQuota />);
		expect(await screen.findByTestId(SELECTORS.filesQuota)).toBeVisible();
	});

	it('should not show files quota when request return error ', async () => {
		const spyInstance = jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo');

		server.use(
			rest.get(`${STORAGES_ENDPOINT}${MYSELF_QUOTA_PATH}`, (req, res, ctx) =>
				res(ctx.status(403, ''))
			)
		);

		setup(<FilesQuota />);
		await waitFor(() =>
			expect(spyInstance.mock.results.map((item) => item.value)).toContainEqual({
				requestFailed: true,
				responseReceived: true,
				limit: undefined,
				used: undefined
			})
		);

		expect(screen.queryByTestId(SELECTORS.filesQuota)).not.toBeInTheDocument();
	});
});
