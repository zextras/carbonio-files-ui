/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { FetchResult } from '@apollo/client';
import { Container, Text, useModal } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { DeleteNodesMutation } from '../../types/graphql/types';

export type DeletePermanentlyAction = () => Promise<FetchResult<DeleteNodesMutation>>;

export function useDeletePermanentlyModal(
	deletePermanentlyAction: DeletePermanentlyAction,
	deletePermanentlyActionCallback?: () => void
): {
	openDeletePermanentlyModal: () => void;
} {
	const createModal = useModal();
	const [t] = useTranslation();
	const openDeletePermanentlyModal = useCallback(() => {
		const closeModal = createModal({
			title: t('modal.deletePermanently.header', 'This action is irreversible'),
			confirmLabel: t('modal.deletePermanently.button.confirm', 'Delete permanently'),
			confirmColor: 'error',
			onConfirm: () => {
				deletePermanentlyAction().then(() => {
					deletePermanentlyActionCallback && deletePermanentlyActionCallback();
					closeModal();
				});
			},
			showCloseIcon: true,
			onClose: () => {
				closeModal();
			},
			children: (
				<Container padding={{ vertical: 'large' }}>
					<Text overflow="break-word" size="small">
						{t(
							'modal.deletePermanently.body',
							'You will delete permanently this item/these items. You will not be able to recover this file/these files anymore. This action is irreversible.'
						)}
					</Text>
				</Container>
			)
		});
	}, [createModal, deletePermanentlyAction, deletePermanentlyActionCallback, t]);

	return { openDeletePermanentlyModal };
}
