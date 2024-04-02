/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { useReactiveVar } from '@apollo/client';
import { Banner } from '@zextras/carbonio-design-system';
import { some } from 'lodash';
import { useTranslation } from 'react-i18next';

import { uploadVar } from '../../apollo/uploadVar';
import { UPLOAD_STATUS_CODE } from '../../constants';
import { UploadStatus } from '../../types/graphql/client-types';

export const OverQuotaBanner = (): React.JSX.Element | null => {
	const [t] = useTranslation();
	const uploadVarData = useReactiveVar(uploadVar);

	const isOverQuotaFailure = useMemo(
		() =>
			some(
				uploadVarData,
				(upload) =>
					upload.status === UploadStatus.FAILED &&
					upload.statusCode === UPLOAD_STATUS_CODE.overQuota
			),
		[uploadVarData]
	);

	return isOverQuotaFailure ? (
		<Banner
			description={t(
				'uploads.banner.overQuota.description',
				'The uploading of some items failed because you have reached your storage limit. Delete some items to free up storage space and try again.'
			)}
			status="error"
			title={t('uploads.banner.overQuota.title', 'Quota exceeded')}
			type="standard"
		/>
	) : null;
};
