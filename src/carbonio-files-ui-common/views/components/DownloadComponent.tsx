/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo } from 'react';

import { Button, Tooltip, useModal } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { ROOTS } from '../../constants';
import { useDownloadNodes } from '../../hooks/useDownloadNodes';

interface DownloadComponentProps {
	currentFolderId: string;
	folderName?: string;
}

export const DownloadComponent = ({
	currentFolderId,
	folderName
}: DownloadComponentProps): React.JSX.Element => {
	const [t] = useTranslation();
	const { createModal, closeModal } = useModal();
	const { downloadMultipleNodes } = useDownloadNodes();

	const modalTitle = useMemo(() => {
		if (currentFolderId === ROOTS.LOCAL_ROOT) {
			return t('actions.download.multiple.modal.root.title', 'Download all');
		}
		return t('actions.download.multiple.modal.folder.title', 'Download {{folderName}}', {
			replace: {
				folderName
			}
		});
	}, [currentFolderId, folderName, t]);

	const modalContent = useMemo(() => {
		if (currentFolderId === ROOTS.LOCAL_ROOT) {
			return t(
				'actions.download.multiple.modal.root.content',
				"You're about to download all your items. This operation may take several minutes."
			);
		}
		return t(
			'actions.download.multiple.modal.folder.content',
			"You're about to download all your items in this folder. This operation may take several minutes."
		);
	}, [currentFolderId, t]);

	const download = useCallback(() => {
		createModal({
			id: currentFolderId,
			title: modalTitle,
			children: modalContent,
			confirmLabel: t('actions.download.multiple.modal.button.label', 'Download all'),
			onConfirm: () => {
				downloadMultipleNodes([currentFolderId]);
				closeModal(currentFolderId);
			},
			onSecondaryAction: () => closeModal(currentFolderId),
			secondaryActionLabel: t('modal.button.cancel', 'Cancel'),
			onClose: () => closeModal(currentFolderId),
			closeIconTooltip: t('modal.close.tooltip', 'Close')
		});
	}, [
		closeModal,
		createModal,
		currentFolderId,
		downloadMultipleNodes,
		modalContent,
		modalTitle,
		t
	]);

	return (
		<Tooltip label={t('actions.download.multiple.button.tooltip', 'Download all')}>
			<Button type={'ghost'} color={'text'} icon={'DownloadOutline'} onClick={download} />
		</Tooltip>
	);
};
