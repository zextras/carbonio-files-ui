/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { useModal } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { Node } from '../../types/graphql/types';
import { UpdateNodeNameModalContent } from '../../views/components/UpdateNodeNameModalContent';
import { useUpdateNodeMutation } from '../graphql/mutations/useUpdateNodeMutation';

export type OpenRenameModal = (node: Pick<Node, 'id' | 'name'>) => void;

export function useRenameModal(renameActionCallback?: (nodeId: string) => void): {
	openRenameModal: OpenRenameModal;
} {
	const createModal = useModal();
	const [t] = useTranslation();
	const [renameAction] = useUpdateNodeMutation();

	const confirmAction = useCallback(
		(nodeId, newName) => {
			if (newName) {
				return renameAction(nodeId, newName);
			}
			return Promise.reject(new Error('name cannot be emtpy'));
		},
		[renameAction]
	);

	const openRenameModal = useCallback<OpenRenameModal>(
		(node) => {
			const closeModal = createModal(
				{
					onClose: () => {
						renameActionCallback?.(node.id);
						closeModal();
					},
					children: (
						<UpdateNodeNameModalContent
							inputLabel={t('node.rename.modal.input.label.name', 'Item name')}
							nodeName={node.name}
							confirmAction={confirmAction}
							confirmLabel={t('node.rename.modal.button.confirm', 'Rename')}
							nodeId={node.id}
							closeAction={(): void => {
								renameActionCallback && renameActionCallback(node.id);
								closeModal();
							}}
							title={t('node.rename.modal.title', 'Rename item')}
						/>
					)
				},
				true
			);
		},
		[confirmAction, createModal, renameActionCallback, t]
	);

	return { openRenameModal };
}
