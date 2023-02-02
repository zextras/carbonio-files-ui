/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { Icon, Row, RowProps, Text } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { UploadStatus } from '../../types/graphql/client-types';

interface UploadStatusProps {
	status: UploadStatus;
	progress: number;
	contentCount: number | undefined;
	gap: RowProps['gap'];
}

export const UploadStatusComponent = ({
	status,
	progress,
	contentCount,
	gap
}: UploadStatusProps): JSX.Element => {
	const [t] = useTranslation();

	const icon =
		(status === UploadStatus.COMPLETED && 'CheckmarkCircle2') ||
		(status === UploadStatus.LOADING && 'AnimatedLoader') ||
		(status === UploadStatus.FAILED && 'AlertCircle') ||
		'AnimatedLoader';

	const color =
		(status === UploadStatus.COMPLETED && 'success') ||
		(status === UploadStatus.FAILED && 'error') ||
		undefined;

	return (
		<Row gap={gap} wrap={'nowrap'}>
			<Text size={'small'}>
				{(status === UploadStatus.QUEUED && t('uploadItem.queued', 'Queued')) ||
					(contentCount !== undefined && `${progress}/${contentCount}`) ||
					`${progress}%`}
			</Text>
			<Icon icon={icon} color={color} />
		</Row>
	);
};
