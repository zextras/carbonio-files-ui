/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { FetchResult } from '@apollo/client';
import { Button, Container, Icon, Text, useModal } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { UpdateSharesMutation } from '../../types/graphql/types';

export type UpdateShareAction = () => Promise<FetchResult<UpdateSharesMutation>>;

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
			title: (
				<Container
					mainAlignment="flex-start"
					crossAlignment="flex-start"
					orientation="horizontal"
					gap="0.5rem"
				>
					<Icon icon="AlertCircleOutline" color={'error'} size="large" />
					<Text weight="bold">
						{t('modal.decreaseYourOwnSharePermissions.header', 'Decrease your current rights')}
					</Text>
				</Container>
			),
			onClose: () => {
				closeModal(modalId);
			},
			children: (
				<Container
					mainAlignment={'flex-start'}
					crossAlignment={'flex-start'}
					padding={{ vertical: 'large' }}
					gap="1rem"
				>
					<Container mainAlignment={'flex-start'} crossAlignment={'flex-start'}>
						<Text overflow="break-word">
							{t(
								'modal.decreaseYourOwnSharePermissions.body1',
								"Are you sure to decrease your rights on this item? The action is permanent and you won't be able to restore the previous share's rights by yourself."
							)}
						</Text>
						<Text overflow="break-word">
							{t(
								'modal.decreaseYourOwnSharePermissions.body2',
								"You can always contact the shared item's owner if you need the previous permission to be restored."
							)}
						</Text>
					</Container>
					<Text color={'error'} weight="bold">
						{t('modal.deleteShare.warning', 'This action cannot be undone.')}
					</Text>
				</Container>
			),
			customFooter: (
				<Container mainAlignment={'flex-end'} orientation={'horizontal'} gap="0.5rem">
					<Button
						label={t('modal.deleteShare.button.cancel', 'No, cancel')}
						onClick={() => closeModal(modalId)}
						color={'secondary'}
						type="outlined"
					/>
					<Button
						// eslint-disable-next-line jsx-a11y/no-autofocus
						autoFocus
						label={t(
							'modal.decreaseYourOwnSharePermissions.button.confirmDecrease',
							'Yes, confirm'
						)}
						onClick={() => {
							updateShareAction().then(() => {
								updateShareActionCallback?.();
								closeModal(modalId);
							});
						}}
						color="error"
					/>
				</Container>
			)
		});
	}, [closeModal, createModal, t, updateShareAction, updateShareActionCallback]);

	return { openDecreaseYourOwnSharePermissionModal };
}
