/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { act } from '@testing-library/react';
import * as shell from '@zextras/carbonio-shell-ui';
import { keyBy } from 'lodash';
import { graphql, HttpResponse } from 'msw';

import { PrimaryBadgeUpdater } from './PrimaryBadgeUpdater';
import { uploadVar } from '../carbonio-files-ui-common/apollo/uploadVar';
import { FILES_APP_ID } from '../carbonio-files-ui-common/constants';
import {
	populateAddedNodeNotification,
	populateUploadItems
} from '../carbonio-files-ui-common/mocks/mockUtils';
import { setup } from '../carbonio-files-ui-common/tests/utils';
import { UploadStatus } from '../carbonio-files-ui-common/types/graphql/client-types';
import { GetNotificationsDocument } from '../carbonio-files-ui-common/types/graphql/types';
import server from '../mocks/server';

describe('PrimaryBarElement', () => {
	test('should render an alert icon if an upload fails', () => {
		const updatePrimaryBadgeSpy = vi.spyOn(shell, 'updatePrimaryBadge');
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
			FILES_APP_ID
		);
		act(() => {
			uploadVar({
				...uploadVar(),
				[uploadItems[0].id]: { ...uploadItems[0], status: UploadStatus.COMPLETED }
			});
		});
		expect(updatePrimaryBadgeSpy).toHaveBeenLastCalledWith(
			{
				show: false
			},
			FILES_APP_ID
		);
	});

	it('should render the Notifications badge counter if there are notifications', async () => {
		const updatePrimaryBadgeSpy = vi.spyOn(shell, 'updatePrimaryBadge');
		const notifications = Array.from({ length: 3 }, () => populateAddedNodeNotification());
		const unread = 1;
		server.use(
			graphql.query(GetNotificationsDocument, () =>
				HttpResponse.json({
					data: {
						getNotifications: {
							__typename: 'NotificationPage',
							last_seen: faker.date.recent().getTime(),
							notifications,
							page_token: null,
							unread
						}
					}
				})
			)
		);
		setup(<PrimaryBadgeUpdater />);

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		expect(updatePrimaryBadgeSpy).toHaveBeenCalledWith(
			{
				show: true,
				count: unread,
				showCount: true
			},
			FILES_APP_ID
		);
	});
});
