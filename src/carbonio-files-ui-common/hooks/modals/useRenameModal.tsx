/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { FetchResult } from '@apollo/client';
import { useModal } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { Node, UpdateNodeMutation } from '../../types/graphql/types';
import { UpdateNodeNameModalContent } from '../../views/components/UpdateNodeNameModalContent';

export type OpenRenameModal = (node: Pick<Node, 'id' | 'name'>) => void;

export function useRenameModal(
	renameAction: (nodeId: string, newName: string) => Promise<FetchResult<UpdateNodeMutation>>,
	renameActionCallback?: () => void
): {
	openRenameModal: OpenRenameModal;
} {
	const { createModal, closeModal } = useModal();
	const [t] = useTranslation();

	const confirmAction = useCallback(
		(nodeId: string, newName: string) => {
			if (newName) {
				return renameAction(nodeId, newName);
			}
			return Promise.reject(new Error('name cannot be emtpy'));
		},
		[renameAction]
	);

	const openRenameModal = useCallback<OpenRenameModal>(
		(node) => {
			const modalId = 'files-rename-node-modal';
			createModal(
				{
					id: modalId,
					onClose: () => {
						renameActionCallback?.();
						closeModal(modalId);
					},
					children: (
						<UpdateNodeNameModalContent
							inputLabel={t('node.rename.modal.input.label.name', 'Item name')}
							nodeName={node.name}
							confirmAction={confirmAction}
							confirmLabel={t('node.rename.modal.button.confirm', 'Rename')}
							nodeId={node.id}
							closeAction={(): void => {
								renameActionCallback?.();
								closeModal(modalId);
							}}
							title={t('node.rename.modal.title', 'Rename item')}
						/>
					)
				},
				true
			);
		},
		[closeModal, confirmAction, createModal, renameActionCallback, t]
	);

	return { openRenameModal };
}
