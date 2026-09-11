/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { useModal } from '@zextras/carbonio-design-system';

import { Node } from '../../types/common';
import { TransferOwnershipModalContent } from '../../views/components/TransferOwnershipModalContent';

export type OpenTransferOwnershipModal = (nodes: Array<Node<'id'>>) => void;

const modalId = 'files-transfer-ownership-modal';

export function useTransferOwnershipModal(actionCallback?: () => void): {
	openTransferOwnershipModal: OpenTransferOwnershipModal;
} {
	const { createModal, closeModal } = useModal();

	const closeAction = useCallback(() => {
		actionCallback?.();
		closeModal(modalId);
	}, [actionCallback, closeModal]);

	const openTransferOwnershipModal = useCallback<OpenTransferOwnershipModal>(
		(nodes) => {
			createModal(
				{
					id: modalId,
					minHeight: '25rem',
					onClose: closeAction,
					focusModalContent: false,
					children: <TransferOwnershipModalContent nodes={nodes} closeAction={closeAction} />
				},
				true
			);
		},
		[createModal, closeAction]
	);

	return { openTransferOwnershipModal };
}
