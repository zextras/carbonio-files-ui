/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { act } from '@testing-library/react';
import { keyBy } from 'lodash';
import { graphql, HttpResponse } from 'msw';

import { SecondaryBar } from './SecondaryBar';
import { uploadVar } from '../../carbonio-files-ui-common/apollo/uploadVar';
import { ROOTS } from '../../carbonio-files-ui-common/constants';
import { ICON_REGEXP } from '../../carbonio-files-ui-common/constants/test';
import {
	populateAddedNodeNotification,
	populateUploadItem,
	populateUploadItems
} from '../../carbonio-files-ui-common/mocks/mockUtils';
import { screen, setup } from '../../carbonio-files-ui-common/tests/utils';
import { UploadStatus } from '../../carbonio-files-ui-common/types/graphql/client-types';
import { GetNotificationsDocument } from '../../carbonio-files-ui-common/types/graphql/types';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import server from '../../mocks/server';

vi.mock('../../carbonio-files-ui-common/views/components/FilesQuota', () => ({
	FilesQuota: (): React.JSX.Element => <div data-testid="quota-test-id"></div>
}));
vi.mock('../../hooks/useIsCarbonioCE', () => ({
	useIsCarbonioCE: vi.fn(() => false)
}));
vi.mock('../../hooks/useFeatureFlag', () => ({
	useFeatureFlag: vi.fn(() => undefined)
}));

describe('SecondaryBar', () => {
	describe('FilesQuota feature flag', () => {
		it('should render FilesQuota when totalQuota feature flag is off', () => {
			setup(<SecondaryBar expanded />);
			expect(screen.getByTestId('quota-test-id')).toBeVisible();
		});

		it('should not render FilesQuota when totalQuota feature flag is on', () => {
			vi.mocked(useFeatureFlag).mockReturnValue(true);
			setup(<SecondaryBar expanded />);
			expect(screen.queryByTestId('quota-test-id')).not.toBeInTheDocument();
		});
	});

	describe('Notifications', () => {
		it('should render the Notifications entry without the notifications badge counter if there are no notifications', () => {
			setup(<SecondaryBar expanded />);
			expect(screen.getByTestId(ICON_REGEXP.secondaryBarNotifications)).toBeVisible();
			expect(screen.getByText(/notifications/i)).toBeVisible();
			expect(
				screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.chevronRightNotifications })
			).toBeVisible();
		});

		it('should render the Notifications entry with the notifications badge counter if there are notifications', async () => {
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
			setup(<SecondaryBar expanded />);

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(screen.getByTestId(ICON_REGEXP.secondaryBarNotifications)).toBeVisible();
			expect(screen.getByText(/notifications/i)).toBeVisible();
			expect(
				screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.chevronRightNotifications })
			).toBeVisible();
			expect(screen.getByText(unread)).toBeVisible();
		});

		it('should remove the counter badge once the user opens the Notifications popover', async () => {
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
			const { user } = setup(<SecondaryBar expanded />);

			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(screen.getByText(unread)).toBeVisible();
			await user.click(
				screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.chevronRightNotifications })
			);
			expect(screen.queryByText(unread)).not.toBeInTheDocument();
		});

		describe('Upload item', () => {
			test('should render the upload item without the badge', () => {
				setup(<SecondaryBar expanded />);
				expect(screen.getByText(/uploads/i)).toBeVisible();
				expect(screen.queryByText('0/0')).not.toBeInTheDocument();
			});

			test('the badge appears when an upload is added', () => {
				const uploadItem = populateUploadItem({
					status: UploadStatus.LOADING,
					parentNodeId: ROOTS.LOCAL_ROOT
				});
				uploadVar({ [uploadItem.id]: uploadItem });
				setup(<SecondaryBar expanded />);
				expect(screen.getByText('0/1')).toBeVisible();
			});
			test('the badge shows the number of completed item on the total number of items', () => {
				const uploadItems = populateUploadItems(4);
				uploadItems[0].status = UploadStatus.LOADING;
				uploadItems[1].status = UploadStatus.COMPLETED;
				uploadItems[2].status = UploadStatus.QUEUED;
				uploadItems[3].status = UploadStatus.FAILED;
				uploadVar(keyBy(uploadItems, (item) => item.id));
				setup(<SecondaryBar expanded />);
				expect(screen.getByText('1/4')).toBeVisible();
				act(() => {
					uploadVar({
						...uploadVar(),
						[uploadItems[0].id]: { ...uploadItems[0], status: UploadStatus.COMPLETED }
					});
				});
				expect(screen.getByText('2/4')).toBeVisible();
			});
			test('should render an icon alert if an upload fails', () => {
				const uploadItems = populateUploadItems(4);
				uploadItems[0].status = UploadStatus.FAILED;
				uploadVar(keyBy(uploadItems, (item) => item.id));
				setup(<SecondaryBar expanded />);
				expect(screen.getByTestId(ICON_REGEXP.uploadFailed)).toBeVisible();
				act(() => {
					uploadVar({
						...uploadVar(),
						[uploadItems[0].id]: { ...uploadItems[0], status: UploadStatus.COMPLETED }
					});
				});
				expect(screen.queryByTestId(ICON_REGEXP.uploadFailed)).not.toBeInTheDocument();
			});
		});
	});
});
