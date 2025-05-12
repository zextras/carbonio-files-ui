/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useEffect, useMemo } from 'react';

import { useReactiveVar } from '@apollo/client';
import { updatePrimaryBadge } from '@zextras/carbonio-shell-ui';

import { isNotificationsBadgeCounterShownVar } from '../carbonio-files-ui-common/apollo/isNotificationsBadgeCounterShownVar';
import { uploadVar } from '../carbonio-files-ui-common/apollo/uploadVar';
import { FILES_ROUTE } from '../carbonio-files-ui-common/constants';
import { useGetNotificationsQuery } from '../carbonio-files-ui-common/hooks/graphql/queries/useGetNotificationsQuery';
import { UploadStatus } from '../carbonio-files-ui-common/types/graphql/client-types';

export const PrimaryBadgeUpdater = (): null => {
	const { unread } = useGetNotificationsQuery();
	const uploadStatus = useReactiveVar(uploadVar);
	const isNotificationsBadgeCounterShown = useReactiveVar(isNotificationsBadgeCounterShownVar);
	const isUploadFailed = useMemo(
		() => Object.values(uploadStatus).some((item) => item.status === UploadStatus.FAILED),
		[uploadStatus]
	);

	useEffect(() => {
		if (isUploadFailed) {
			updatePrimaryBadge(
				{ show: isUploadFailed, color: 'error', icon: 'AlertCircle' },
				FILES_ROUTE
			);
		}
		if (unread) {
			updatePrimaryBadge(
				{ show: !!unread && isNotificationsBadgeCounterShown, count: unread, showCount: true },
				FILES_ROUTE
			);
		}
	}, [isNotificationsBadgeCounterShown, isUploadFailed, unread]);

	return null;
};
