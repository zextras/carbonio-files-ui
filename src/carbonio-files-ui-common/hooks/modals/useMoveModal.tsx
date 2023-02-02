/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { useModal, useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { GetNodeParentType, Node } from '../../types/common';
import { MoveNodesModalContent } from '../../views/components/MoveNodesModalContent';
import { useDestinationVarManager } from '../useDestinationVarManager';

export type OpenMoveModal = (
	nodes: Array<Pick<Node, '__typename' | 'id' | 'owner'> & GetNodeParentType>,
	fromFolder?: string
) => void;

export function useMoveModal(moveNodesActionCallback?: () => void): {
	openMoveNodesModal: OpenMoveModal;
} {
	const createModal = useModal();

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
						'You cannot move multiple nodes from a filter or a search'
					),
					replace: true,
					type: 'error',
					hideButton: true
				});
			}
			if (folderToOpen) {
				const closeModal = createModal(
					{
						minHeight: '25rem',
						maxHeight: '60vh',
						onClose: () => {
							resetAll();
							closeModal();
						},
						onClick: resetCurrent,
						children: (
							<MoveNodesModalContent
								closeAction={(): void => {
									moveNodesActionCallback && moveNodesActionCallback();
									resetAll();
									closeModal();
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
		[createModal, createSnackbar, moveNodesActionCallback, resetAll, resetCurrent, t]
	);

	return { openMoveNodesModal };
}
