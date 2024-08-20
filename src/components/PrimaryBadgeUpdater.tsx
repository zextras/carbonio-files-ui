/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useEffect, useMemo } from 'react';

import { useReactiveVar } from '@apollo/client';
import { updatePrimaryBadge } from '@zextras/carbonio-shell-ui';

import { uploadVar } from '../carbonio-files-ui-common/apollo/uploadVar';
import { FILES_ROUTE } from '../carbonio-files-ui-common/constants';
import { UploadStatus } from '../carbonio-files-ui-common/types/graphql/client-types';

export const PrimaryBadgeUpdater = (): null => {
	const uploadStatus = useReactiveVar(uploadVar);
	const isUploadFailed = useMemo(
		() => Object.values(uploadStatus).some((item) => item.status === UploadStatus.FAILED),
		[uploadStatus]
	);

	useEffect(() => {
		updatePrimaryBadge({ show: isUploadFailed, color: 'error', icon: 'AlertCircle' }, FILES_ROUTE);
	}, [isUploadFailed]);

	return null;
};
