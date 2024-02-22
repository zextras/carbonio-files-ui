/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import { QuotaProps } from '@zextras/carbonio-design-system';

import { FilesQuota, getPercentage } from './FilesQuota';
import { ICON_REGEXP, SELECTORS } from '../../carbonio-files-ui-common/constants/test';
import { screen, setup } from '../../carbonio-files-ui-common/utils/testUtils';
import { humanFileSize } from '../../carbonio-files-ui-common/utils/utils';
import * as useFilesQuotaInfo from '../../hooks/useFilesQuotaInfo';

const mockQuota = jest.fn().mockReturnValue(<div>mock Quota</div>);

jest.mock('@zextras/carbonio-design-system', () => ({
	...jest.requireActual('@zextras/carbonio-design-system'),
	Quota: (props: QuotaProps): unknown => mockQuota(props)
}));

describe('Files Quota', () => {
	describe('Unlimited available space (limit = 0)', () => {
		it('should show the string "[used] of unlimited space”', () => {
			const used = faker.number.int();
			jest
				.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo')
				.mockReturnValue({ used, limit: 0, requestFailed: false, responseReceived: true });
			const quotaString = `${humanFileSize(used)} of unlimited space`;

			setup(<FilesQuota />);

			expect(screen.getByText(quotaString)).toBeVisible();
		});

		it('should hide the progress bar', () => {
			jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
				used: faker.number.int(),
				limit: 0,
				requestFailed: false,
				responseReceived: true
			});

			setup(<FilesQuota />);
			expect(mockQuota).not.toHaveBeenCalled();
			expect(screen.queryByText('mock Quota')).not.toBeInTheDocument();
		});
	});

	describe('Limited available space (limit != 0)', () => {
		it('should show the string "[used] of [limit] used”', () => {
			const used = faker.number.int();
			const limit = faker.number.int({ min: 1000 });

			jest
				.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo')
				.mockReturnValue({ used, limit, requestFailed: false, responseReceived: true });
			const quotaString = `${humanFileSize(used)} of ${humanFileSize(limit)} used`;

			setup(<FilesQuota />);

			expect(screen.getByText(quotaString)).toBeVisible();
		});
		describe('Quota component', () => {
			it('should render Quota component with props fill < 100 and fillBackground info when used < limit', () => {
				const limit = faker.number.int({ min: 1000 });
				const used = Math.floor(limit / 2);

				jest
					.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo')
					.mockReturnValue({ used, limit, requestFailed: false, responseReceived: true });

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

				jest
					.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo')
					.mockReturnValue({ used, limit, requestFailed: false, responseReceived: true });

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

				jest
					.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo')
					.mockReturnValue({ used, limit, requestFailed: false, responseReceived: true });

				setup(<FilesQuota />);
				expect(mockQuota).toHaveBeenCalledWith({
					fill: getPercentage(used, limit),
					fillBackground: 'error'
				});
				expect(screen.getByText('mock Quota')).toBeVisible();
			});
		});

		it('should show an informative icon near the string, with a tooltip explaining what is happening when used > limit', () => {
			const limit = faker.number.int({ min: 1000 });
			const used = limit * 2;

			jest
				.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo')
				.mockReturnValue({ used, limit, requestFailed: false, responseReceived: true });

			setup(<FilesQuota />);
			expect(screen.getByTestId(ICON_REGEXP.overQuota)).toBeVisible();
		});

		it('should show an informative icon near the string, with a tooltip explaining what is happening when used = limit', () => {
			const limit = faker.number.int({ min: 1000 });
			const used = limit;

			jest
				.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo')
				.mockReturnValue({ used, limit, requestFailed: false, responseReceived: true });

			setup(<FilesQuota />);
			expect(screen.getByTestId(ICON_REGEXP.overQuota)).toBeVisible();
		});
		it('should not show an informative icon near the string when used < limit', () => {
			const limit = faker.number.int({ min: 1000 });
			const used = Math.floor(limit / 2);

			jest
				.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo')
				.mockReturnValue({ used, limit, requestFailed: false, responseReceived: true });

			setup(<FilesQuota />);
			expect(screen.queryByTestId(ICON_REGEXP.overQuota)).not.toBeInTheDocument();
		});
	});

	it('should not show the quota panel if quota info request fails', () => {
		jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
			used: undefined,
			limit: undefined,
			requestFailed: true,
			responseReceived: true
		});

		setup(<FilesQuota />);
		expect(screen.queryByTestId(SELECTORS.filesQuota)).not.toBeInTheDocument();
	});

	it('should not show the quota panel if quota info request is not responded yet', () => {
		jest.spyOn(useFilesQuotaInfo, 'useFilesQuotaInfo').mockReturnValue({
			used: undefined,
			limit: undefined,
			requestFailed: false,
			responseReceived: false
		});

		setup(<FilesQuota />);
		expect(screen.queryByTestId(SELECTORS.filesQuota)).not.toBeInTheDocument();
	});
});
