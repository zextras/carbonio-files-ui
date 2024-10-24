/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { useModal, useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { Node } from '../../types/common';
import { DeepPick } from '../../types/utils';
import { MoveNodesModalContent } from '../../views/components/MoveNodesModalContent';
import { useDestinationVarManager } from '../useDestinationVarManager';

type NodeItem = Node<'id' | 'permissions' | 'rootId'> &
	DeepPick<Node<'parent'>, 'parent', 'id' | 'permissions' | '__typename'> &
	DeepPick<Node<'owner'>, 'owner', 'id'>;

export type OpenMoveModal = (nodes: NodeItem[], fromFolder?: string) => void;

export function useMoveModal(moveNodesActionCallback?: () => void): {
	openMoveNodesModal: OpenMoveModal;
} {
	const { createModal, closeModal } = useModal();

	const createSnackbar = useSnackbar();
	const [t] = useTranslation();

	const { resetAll, resetCurrent } = useDestinationVarManager<string>();

	const openMoveNodesModal = useCallback<OpenMoveModal>(
		(nodes, fromFolder) => {
			let folderToOpen;
			if (fromFolder) {
				folderToOpen = fromFolder;
			} else if (nodes.length === 1 && nodes[0].parent) {
				// case when modal is opened from a filter
				// folderId is not set but nodes have parent
				folderToOpen = nodes[0].parent.id;
			} else {
				// move is not allowed when multiple files are selected in a filter
				createSnackbar({
					key: Date.now().toLocaleString(),
					label: t(
						'node.move.error.not.allowed',
						'You cannot move multiple items from a filter or a search'
					),
					replace: true,
					severity: 'error',
					hideButton: true
				});
			}
			if (folderToOpen) {
				const modalId = 'files-move-nodes-modal';
				createModal(
					{
						id: modalId,
						minHeight: '25rem',
						maxHeight: '60vh',
						onClose: () => {
							resetAll();
							closeModal(modalId);
						},
						onClick: resetCurrent,
						children: (
							<MoveNodesModalContent
								closeAction={(): void => {
									moveNodesActionCallback?.();
									resetAll();
									closeModal(modalId);
								}}
								nodesToMove={nodes}
								folderId={folderToOpen}
							/>
						)
					},
					true
				);
			}
		},
		[closeModal, createModal, createSnackbar, moveNodesActionCallback, resetAll, resetCurrent, t]
	);

	return { openMoveNodesModal };
}
