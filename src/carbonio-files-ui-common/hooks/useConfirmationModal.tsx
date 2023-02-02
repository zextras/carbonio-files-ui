/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { Container, Text, useModal } from '@zextras/carbonio-design-system';

type ConfirmationModalProps<T> = {
	action: () => Promise<T>;
	title: string;
	message: string;
	confirmLabel: string;
	confirmColor?: string;
	onConfirmCallback?: () => void;
};

export function useConfirmationModal<T>({
	action,
	title,
	message,
	confirmLabel,
	confirmColor = 'error',
	onConfirmCallback
}: ConfirmationModalProps<T>): {
	openModal: () => void;
} {
	const createModal = useModal();
	const openModal = useCallback(() => {
		const closeModal = createModal({
			title,
			confirmLabel,
			confirmColor,
			onConfirm: () => {
				action().then(() => {
					onConfirmCallback && onConfirmCallback();
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
						{message}
					</Text>
				</Container>
			)
		});
	}, [action, confirmColor, confirmLabel, createModal, message, onConfirmCallback, title]);

	return { openModal };
}
