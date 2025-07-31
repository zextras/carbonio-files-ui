/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { Button, Tooltip, useModal } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { useDownloadNodes } from '../../hooks/useDownloadNodes';

interface DownloadComponentProps {
	nameFolder?: string;
	currentFolderId: string;
}

export const DownloadComponent = ({
	nameFolder,
	currentFolderId
}: DownloadComponentProps): React.JSX.Element => {
	const [t] = useTranslation();
	const { createModal, closeModal } = useModal();
	const { downloadMultipleNodes } = useDownloadNodes();

	const download = useCallback(() => {
		createModal({
			id: currentFolderId,
			title: t('', 'Download all'),
			children: t(
				'',
				"You're about to download all your items. This operation may take several minutes."
			),
			confirmLabel: t('', 'Download all'),
			onConfirm: () => {
				downloadMultipleNodes([currentFolderId], nameFolder);
				closeModal(currentFolderId);
			},
			onSecondaryAction: () => closeModal(currentFolderId),
			secondaryActionLabel: t('', 'Close'),
			onClose: () => closeModal(currentFolderId)
		});
	}, [closeModal, createModal, currentFolderId, downloadMultipleNodes, nameFolder, t]);

	return (
		<Tooltip label={t('', 'Download all')}>
			<Button type={'ghost'} color={'text'} icon={'DownloadOutline'} onClick={download} />
		</Tooltip>
	);
};
