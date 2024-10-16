/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { FetchResult } from '@apollo/client';
import { Container, Text, useModal } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { UpdateShareMutation } from '../../types/graphql/types';

export type UpdateShareAction = () => Promise<FetchResult<UpdateShareMutation>>;

export function useDecreaseYourOwnSharePermissionModal(
	updateShareAction: UpdateShareAction,
	updateShareActionCallback?: () => void
): {
	openDecreaseYourOwnSharePermissionModal: () => void;
} {
	const { createModal, closeModal } = useModal();
	const [t] = useTranslation();
	const openDecreaseYourOwnSharePermissionModal = useCallback(() => {
		const modalId = 'files-decrease-share-permissions-modal';
		createModal({
			id: modalId,
			title: t('modal.decreaseYourOwnSharePermissions.header', 'Decrease your current rights'),
			confirmLabel: t('modal.decreaseYourOwnSharePermissions.button.confirm', 'Confirm'),
			confirmColor: 'error',
			onConfirm: () => {
				updateShareAction().then(() => {
					updateShareActionCallback?.();
					closeModal(modalId);
				});
			},
			showCloseIcon: true,
			onClose: () => {
				closeModal(modalId);
			},
			children: (
				<Container padding={{ vertical: 'large' }}>
					<Text overflow="break-word" size="small">
						{t(
							'modal.decreaseYourOwnSharePermissions.body',
							"Are you sure to decrease your rights on this item? The action is permanent and you won't be able to restore the previous share's rights by yourself. You can always contact the shared item's owner if you need the previous permission to be restored."
						)}
					</Text>
				</Container>
			)
		});
	}, [closeModal, createModal, t, updateShareAction, updateShareActionCallback]);

	return { openDecreaseYourOwnSharePermissionModal };
}
