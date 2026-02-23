/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo } from 'react';

import { FetchResult } from '@apollo/client';
import { Button, Container, Icon, Text, useModal } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { TransText } from '../design_system_fork/TransText';
import { DeleteSharesMutation, ShareFragment } from '../types/graphql/types';
import { InlineText } from '../views/components/StyledComponents';

export function useDeleteSharesModal(
	deleteSharesAction: () => Promise<FetchResult<DeleteSharesMutation>>,
	shareTarget: NonNullable<ShareFragment['share_target']> | null,
	isYourShare: boolean,
	deleteSharesActionCallback?: () => void,
	isAllSelected?: boolean,
	selectedCount?: number
): {
	openDeleteSharesModal: () => void;
} {
	const { createModal, closeModal } = useModal();
	const [t] = useTranslation();

	const isBulk = shareTarget === null;

	const title = useMemo(() => {
		if (isYourShare) {
			return t('modal.deleteShare.title.yourShare', 'Remove your share');
		}
		if (!isBulk) {
			return t('modal.deleteShare.title.single', 'Remove collaborator');
		}
		if (isAllSelected) {
			return t('modal.deleteShare.title.all', 'Remove all collaborators');
		}
		return t('modal.deleteShare.title.multiple', 'Remove collaborators');
	}, [isAllSelected, isBulk, isYourShare, t]);

	const body = useMemo(() => {
		if (isYourShare) {
			return (
				<Container mainAlignment={'flex-start'} crossAlignment={'flex-start'}>
					<Text overflow="break-word">
						{t(
							'modal.deleteShare.yourShare.body.answer',
							'Are you sure to remove yourself from this collaboration?'
						)}
					</Text>
					<Text overflow="break-word">
						{t(
							'modal.deleteShare.yourShare.body.permissionLost',
							'All the access permission previously given to you will be lost.'
						)}
					</Text>
				</Container>
			);
		}

		if (!isBulk) {
			return (
				<TransText
					i18nKey="modal.deleteShare.body"
					values={{
						shareTarget:
							(shareTarget.__typename === 'DistributionList' && shareTarget.name) ||
							(shareTarget.__typename === 'User' && (shareTarget.full_name || shareTarget.email)) ||
							''
					}}
					overflow="break-word"
				>
					Are you sure to remove all the access permission previously given to
					<InlineText weight="bold">{{ shareTarget }}</InlineText>?
				</TransText>
			);
		}

		return (
			<Text overflow="break-word">
				{isAllSelected
					? t(
							'modal.deleteShare.bulk.body.all',
							"You're about to remove all collaborators from this file. After this action, only you will have access to the file and people it was shared with will no longer be able to view or edit it."
						)
					: t(
							'modal.deleteShare.bulk.body.multiple',
							`You're about to remove {{count}} collaborator(s) from this file. After this action, these people will no longer be able to view or edit it.`,
							{
								count: selectedCount
							}
						)}
			</Text>
		);
	}, [isBulk, isAllSelected, isYourShare, selectedCount, shareTarget, t]);

	const confirmButtonLabel = useMemo(() => {
		if (isAllSelected) {
			return t('modal.deleteShare.button.confirmAll', 'Yes, remove all');
		}
		return t('modal.deleteShare.button.confirmRemove', 'Yes, remove');
	}, [isAllSelected, t]);

	const openDeleteSharesModal = useCallback(() => {
		const modalId = 'files-delete-share-modal';
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
					<Text weight="bold">{title}</Text>
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
					{body}
					<Text color="error" weight="bold">
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
						label={confirmButtonLabel}
						onClick={() => {
							deleteSharesAction().then(() => {
								deleteSharesActionCallback?.();
								closeModal(modalId);
							});
						}}
						color="error"
					/>
				</Container>
			)
		});
	}, [
		body,
		closeModal,
		confirmButtonLabel,
		createModal,
		deleteSharesAction,
		deleteSharesActionCallback,
		t,
		title
	]);

	return { openDeleteSharesModal };
}
