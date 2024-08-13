/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act } from '@testing-library/react';
import * as shell from '@zextras/carbonio-shell-ui';
import { keyBy } from 'lodash';

import { PrimaryBadgeUpdater } from './PrimaryBadgeUpdater';
import { uploadVar } from '../carbonio-files-ui-common/apollo/uploadVar';
import { FILES_ROUTE } from '../carbonio-files-ui-common/constants';
import { populateUploadItems } from '../carbonio-files-ui-common/mocks/mockUtils';
import { setup } from '../carbonio-files-ui-common/tests/utils';
import { UploadStatus } from '../carbonio-files-ui-common/types/graphql/client-types';

describe('PrimaryBarElement', () => {
	test('should render an alert icon if an upload fails', () => {
		const updatePrimaryBadgeSpy = jest.spyOn(shell, 'updatePrimaryBadge');
		const uploadItems = populateUploadItems(2);
		uploadItems[0].status = UploadStatus.FAILED;
		uploadItems[1].status = UploadStatus.COMPLETED;
		uploadVar(keyBy(uploadItems, (item) => item.id));
		setup(<PrimaryBadgeUpdater />);
		expect(updatePrimaryBadgeSpy).toHaveBeenCalledWith(
			{
				color: 'error',
				icon: 'AlertCircle',
				show: true
			},
			FILES_ROUTE
		);
		act(() => {
			uploadVar({
				...uploadVar(),
				[uploadItems[0].id]: { ...uploadItems[0], status: UploadStatus.COMPLETED }
			});
		});
		expect(updatePrimaryBadgeSpy).toHaveBeenLastCalledWith(
			{
				color: 'error',
				icon: 'AlertCircle',
				show: false
			},
			FILES_ROUTE
		);
	});
});
