/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useEffect, useMemo } from 'react';

import { useReactiveVar } from '@apollo/client';
import { updatePrimaryBadge } from '@zextras/carbonio-shell-ui';

import { showNotificationsBadgeVar } from '../carbonio-files-ui-common/apollo/showNotificationsBadgeVar';
import { uploadVar } from '../carbonio-files-ui-common/apollo/uploadVar';
import { FILES_APP_ID } from '../carbonio-files-ui-common/constants';
import { useGetNotificationsQuery } from '../carbonio-files-ui-common/hooks/graphql/queries/useGetNotificationsQuery';
import { UploadStatus } from '../carbonio-files-ui-common/types/graphql/client-types';

export const PrimaryBadgeUpdater = (): null => {
	const { unread } = useGetNotificationsQuery();
	const uploadStatus = useReactiveVar(uploadVar);
	const showNotificationsBadge = useReactiveVar(showNotificationsBadgeVar);
	const isUploadFailed = useMemo(
		() => Object.values(uploadStatus).some((item) => item.status === UploadStatus.FAILED),
		[uploadStatus]
	);

	useEffect(() => {
		if (isUploadFailed) {
			updatePrimaryBadge(
				{ show: isUploadFailed, color: 'error', icon: 'AlertCircle' },
				FILES_APP_ID
			);
		} else if (unread && unread > 0 && showNotificationsBadge) {
			updatePrimaryBadge({ show: true, count: unread, showCount: true }, FILES_APP_ID);
		} else {
			updatePrimaryBadge({ show: false }, FILES_APP_ID);
		}
	}, [showNotificationsBadge, isUploadFailed, unread]);

	return null;
};
