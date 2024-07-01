/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import { act } from '@testing-library/react';
import { QuotaProps } from '@zextras/carbonio-design-system';

import { FilesQuota, getPercentage } from './FilesQuota';
import * as mySelfQuotaModule from '../../../network/mySelfQuota';
import { ICON_REGEXP, SELECTORS } from '../../constants/test';
import * as useFilesQuotaInfo from '../../hooks/useFilesQuotaInfo';
import { screen, setup } from '../../tests/utils';
import { humanFileSize } from '../../utils/utils';

const mockQuota = jest.fn().mockReturnValue(<div>mock Quota</div>);

jest.mock('@zextras/carbonio-design-system', () => ({
	...jest.requireActual('@zextras/carbonio-design-system'),
	Quota: (props: QuotaProps): unknown => mockQuota(props)
}));

describe('Files Quota', () => {
	describe('Unlimited available space (limit = 0)', () => {
		it('should show the string "[used] of unlimited space”', () => {
			const used = faker.number.int();
			jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
				used,
				limit: 0,
				requestFailed: false,
				responseReceived: true,
				refreshData: jest.fn()
			});
			const quotaString = `${humanFileSize(used)} of unlimited space`;

			setup(<FilesQuota />);

			expect(screen.getByText(quotaString)).toBeVisible();
		});

		it('should hide the progress bar', () => {
			jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
				used: faker.number.int(),
				limit: 0,
				requestFailed: false,
				responseReceived: true,
				refreshData: jest.fn()
			});

			setup(<FilesQuota />);
			expect(mockQuota).not.toHaveBeenCalled();
			expect(screen.queryByText('mock Quota')).not.toBeInTheDocument();
		});

		it('should never show an informative icon near the string', () => {
			const limit = 0;
			const used = faker.number.int();

			jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
				used,
				limit,
				requestFailed: false,
				responseReceived: true,
				refreshData: jest.fn()
			});

			setup(<FilesQuota />);
			expect(screen.queryByTestId(ICON_REGEXP.overQuota)).not.toBeInTheDocument();
		});
	});

	describe('Limited available space (limit != 0)', () => {
		it('should show the string "[used] of [limit] used”', () => {
			const used = faker.number.int();
			const limit = faker.number.int({ min: 1000 });

			jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
				used,
				limit,
				requestFailed: false,
				responseReceived: true,
				refreshData: jest.fn()
			});
			const quotaString = `${humanFileSize(used)} of ${humanFileSize(limit)} used`;

			setup(<FilesQuota />);

			expect(screen.getByText(quotaString)).toBeVisible();
		});
		describe('Quota component', () => {
			it('should render Quota component with props fill < 100 and fillBackground info when used < limit', () => {
				const limit = faker.number.int({ min: 1000 });
				const used = Math.floor(limit / 2);

				jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
					used,
					limit,
					requestFailed: false,
					responseReceived: true,
					refreshData: jest.fn()
				});

				setup(<FilesQuota />);
				expect(mockQuota).toHaveBeenCalledWith({
					fill: getPercentage(used, limit),
					fillBackground: 'info'
				});
				expect(screen.getByText('mock Quota')).toBeVisible();
			});

			it('should render Quota component with props fill = 100 and fillBackground error when used === limit', () => {
				const limit = faker.number.int({ min: 1000 });
				const used = limit;

				jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
					used,
					limit,
					requestFailed: false,
					responseReceived: true,
					refreshData: jest.fn()
				});

				setup(<FilesQuota />);
				expect(mockQuota).toHaveBeenCalledWith({
					fill: getPercentage(used, limit),
					fillBackground: 'error'
				});
				expect(screen.getByText('mock Quota')).toBeVisible();
			});

			it('should render Quota component passing props fill = 100 and fillBackground error when used > limit', () => {
				const limit = faker.number.int({ min: 1000 });
				const used = limit * 2;

				jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
					used,
					limit,
					requestFailed: false,
					responseReceived: true,
					refreshData: jest.fn()
				});

				setup(<FilesQuota />);
				expect(mockQuota).toHaveBeenCalledWith({
					fill: getPercentage(used, limit),
					fillBackground: 'error'
				});
				expect(screen.getByText('mock Quota')).toBeVisible();
			});
		});

		it('should show an informative icon near the string, with a tooltip explaining what is happening when used > limit', async () => {
			const limit = faker.number.int({ min: 1000 });
			const used = limit * 2;

			jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
				used,
				limit,
				requestFailed: false,
				responseReceived: true,
				refreshData: jest.fn()
			});

			const { user } = setup(<FilesQuota />);

			const overQuotaIcon = screen.getByTestId(ICON_REGEXP.overQuota);
			expect(overQuotaIcon).toBeVisible();
			act(() => {
				// run tooltip timer to register listeners
				jest.runOnlyPendingTimers();
			});
			await user.hover(overQuotaIcon);

			expect(
				await screen.findByText(/You have reached the maximum quota available./i)
			).toBeVisible();
		});

		it('should show an informative icon near the string, with a tooltip explaining what is happening when used = limit', async () => {
			const limit = faker.number.int({ min: 1000 });
			const used = limit;

			jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
				used,
				limit,
				requestFailed: false,
				responseReceived: true,
				refreshData: jest.fn()
			});

			const { user } = setup(<FilesQuota />);
			const overQuotaIcon = screen.getByTestId(ICON_REGEXP.overQuota);
			expect(overQuotaIcon).toBeVisible();
			act(() => {
				// run tooltip timer to register listeners
				jest.runOnlyPendingTimers();
			});
			await user.hover(overQuotaIcon);

			expect(
				await screen.findByText(/You have reached the maximum quota available./i)
			).toBeVisible();
		});

		it('should not show an informative icon near the string when used < limit', () => {
			const limit = faker.number.int({ min: 1000 });
			const used = Math.floor(limit / 2);

			jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
				used,
				limit,
				requestFailed: false,
				responseReceived: true,
				refreshData: jest.fn()
			});

			setup(<FilesQuota />);
			expect(screen.queryByTestId(ICON_REGEXP.overQuota)).not.toBeInTheDocument();
		});
	});

	it('should not show the quota panel if quota info request fails', () => {
		jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
			used: undefined,
			limit: undefined,
			requestFailed: true,
			responseReceived: true,
			refreshData: jest.fn()
		});

		setup(<FilesQuota />);
		expect(screen.queryByTestId(SELECTORS.filesQuota)).not.toBeInTheDocument();
	});

	it('should not show the quota panel if quota info request is not responded yet', () => {
		jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
			used: undefined,
			limit: undefined,
			requestFailed: false,
			responseReceived: false,
			refreshData: jest.fn()
		});

		setup(<FilesQuota />);
		expect(screen.queryByTestId(SELECTORS.filesQuota)).not.toBeInTheDocument();
	});

	describe('Refresh button', () => {
		it('should render refresh button', () => {
			const used = faker.number.int();
			const limit = faker.number.int({ min: 1000 });
			jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
				used,
				limit,
				requestFailed: false,
				responseReceived: true,
				refreshData: jest.fn()
			});
			setup(<FilesQuota />);
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.refreshQuota })).toBeVisible();
		});

		it('should show tooltip on hover', async () => {
			const used = faker.number.int();
			const limit = faker.number.int({ min: 1000 });
			jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
				used,
				limit,
				requestFailed: false,
				responseReceived: true,
				refreshData: jest.fn()
			});
			const { user } = setup(<FilesQuota />);
			act(() => {
				// run tooltip timer to register listeners
				jest.runOnlyPendingTimers();
			});
			await user.hover(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.refreshQuota }));
			expect(await screen.findByText(/refresh/i)).toBeVisible();
		});

		it('should refresh the quota data when the user clicks on the refresh button', async () => {
			const limit = 100;
			const quotaUsed = 50;
			const updatedQuotaUsed = 99;
			const quotaString = `${humanFileSize(quotaUsed)} of ${humanFileSize(limit)} used`;
			const updatedQuotaString = `${humanFileSize(updatedQuotaUsed)} of ${humanFileSize(
				limit
			)} used`;
			const mockMySelfQuota = jest
				.spyOn(mySelfQuotaModule, 'mySelfQuota')
				.mockResolvedValueOnce({ limit, used: quotaUsed })
				.mockResolvedValueOnce({ limit, used: updatedQuotaUsed });

			const { user } = setup(<FilesQuota />);
			expect(await screen.findByTestId(SELECTORS.filesQuota)).toBeVisible();
			expect(mockMySelfQuota).toHaveBeenCalledTimes(1);
			expect(screen.getByText(quotaString)).toBeVisible();
			const refreshBtn = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.refreshQuota });
			await user.click(refreshBtn);
			expect(mockMySelfQuota).toHaveBeenCalledTimes(2);
			expect(screen.getByText(updatedQuotaString)).toBeVisible();
		});

		it.each([
			[0, 'unlimited space'],
			[100, `${humanFileSize(100)} used`]
		])(
			'should refresh the quota data when the user clicks on the refresh button (limit: %s)',
			async (limit, description) => {
				const quotaUsed = 50;
				const updatedQuotaUsed = 99;
				const quotaString = `${humanFileSize(quotaUsed)} of ${description}`;
				const updatedQuotaString = `${humanFileSize(updatedQuotaUsed)} of ${description}`;
				const mockMySelfQuota = jest
					.spyOn(mySelfQuotaModule, 'mySelfQuota')
					.mockResolvedValueOnce({ limit, used: quotaUsed })
					.mockResolvedValueOnce({ limit, used: updatedQuotaUsed });

				const { user } = setup(<FilesQuota />);
				expect(await screen.findByTestId(SELECTORS.filesQuota)).toBeVisible();
				expect(mockMySelfQuota).toHaveBeenCalledTimes(1);
				expect(screen.getByText(quotaString)).toBeVisible();
				const refreshBtn = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.refreshQuota });
				await user.click(refreshBtn);
				expect(mockMySelfQuota).toHaveBeenCalledTimes(2);
				expect(screen.getByText(updatedQuotaString)).toBeVisible();
			}
		);
	});
});
