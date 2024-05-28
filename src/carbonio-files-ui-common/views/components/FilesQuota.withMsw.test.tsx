/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { FilesQuota } from './FilesQuota';
import server from '../../../mocks/server';
import { MYSELF_QUOTA_PATH, STORAGES_ENDPOINT } from '../../constants';
import { SELECTORS } from '../../constants/test';
import * as useFilesQuotaInfo from '../../hooks/useFilesQuotaInfo';
import { screen, setup } from '../../tests/utils';

describe('Files Quota', () => {
	it('should show files quota when request return successfully', async () => {
		setup(<FilesQuota />);
		await act(async () => {
			await jest.advanceTimersToNextTimerAsync();
		});
		expect(await screen.findByTestId(SELECTORS.filesQuota)).toBeVisible();
	});

	it('should not show files quota when request return error ', async () => {
		const spyInstance = jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo');

		server.use(
			http.get(`${STORAGES_ENDPOINT}${MYSELF_QUOTA_PATH}`, () =>
				HttpResponse.json(null, { status: 403 })
			)
		);

		setup(<FilesQuota />);
		await waitFor(() =>
			expect(spyInstance.mock.results.map((item) => item.value)).toContainEqual({
				requestFailed: true,
				responseReceived: true,
				limit: undefined,
				used: undefined,
				refreshData: expect.any(Function)
			})
		);
		expect(screen.queryByTestId(SELECTORS.filesQuota)).not.toBeInTheDocument();
	});
});
