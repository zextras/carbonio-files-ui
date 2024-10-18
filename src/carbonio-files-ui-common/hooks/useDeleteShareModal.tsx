/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { FetchResult } from '@apollo/client';
import { Container, Text, useModal } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { TransText } from '../design_system_fork/TransText';
import { DeleteShareMutation, ShareFragment } from '../types/graphql/types';
import { InlineText } from '../views/components/StyledComponents';

export function useDeleteShareModal(
	deleteShareAction: () => Promise<FetchResult<DeleteShareMutation>>,
	shareTarget: NonNullable<ShareFragment['share_target']>,
	isYourShare: boolean,
	deleteShareActionCallback?: () => void
): {
	openDeleteShareModal: () => void;
} {
	const { createModal, closeModal } = useModal();
	const [t] = useTranslation();
	const openDeleteShareModal = useCallback(() => {
		const modalId = 'files-delete-share-modal';
		createModal({
			id: modalId,
			title: t('modal.deleteShare.header', 'Remove share'),
			confirmLabel: t('modal.deleteShare.button.confirm', 'Remove'),
			confirmColor: 'error',
			onConfirm: () => {
				deleteShareAction().then(() => {
					deleteShareActionCallback?.();
					closeModal(modalId);
				});
			},
			showCloseIcon: true,
			onClose: () => {
				closeModal(modalId);
			},
			children: (
				<Container padding={{ vertical: 'large' }}>
					{!isYourShare ? (
						<TransText
							i18nKey="modal.deleteShare.body"
							values={{
								shareTarget:
									(shareTarget.__typename === 'DistributionList' && shareTarget.name) ||
									(shareTarget.__typename === 'User' &&
										(shareTarget.full_name || shareTarget.email)) ||
									''
							}}
							overflow="break-word"
							size="small"
						>
							Are you sure to remove all the access permission previously given to
							<InlineText weight="bold" size="small">
								{{ shareTarget }}
							</InlineText>
							?
						</TransText>
					) : (
						<>
							<Text overflow="break-word" size="small">
								{t(
									'modal.deleteShare.yourShare.body.answer',
									'Are you sure to remove yourself from this collaboration?'
								)}
							</Text>
							<Text overflow="break-word" size="small">
								{t(
									'modal.deleteShare.yourShare.body.permissionLost',
									'All the access permission previously given to you will be lost.'
								)}
							</Text>
						</>
					)}
				</Container>
			)
		});
	}, [
		closeModal,
		createModal,
		deleteShareAction,
		deleteShareActionCallback,
		isYourShare,
		shareTarget,
		t
	]);

	return { openDeleteShareModal };
}
