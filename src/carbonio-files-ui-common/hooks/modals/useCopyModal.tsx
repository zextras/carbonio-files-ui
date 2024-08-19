/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { useModal } from '@zextras/carbonio-design-system';

import { GetNodeParentType, Node } from '../../types/common';
import { CopyNodesModalContent } from '../../views/components/CopyNodesModalContent';
import { useDestinationVarManager } from '../useDestinationVarManager';

export type OpenCopyModal = (
	nodes: Array<Pick<Node, '__typename' | 'id'> & GetNodeParentType>,
	fromFolder?: string
) => void;

export function useCopyModal(copyNodesActionCallback?: () => void): {
	openCopyNodesModal: OpenCopyModal;
} {
	const { createModal, closeModal } = useModal();

	const { resetAll, resetCurrent } = useDestinationVarManager<string>();

	const openCopyNodesModal = useCallback<OpenCopyModal>(
		(nodes, fromFolder) => {
			const modalId = 'files-copy-nodes-modal';
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
						<CopyNodesModalContent
							closeAction={(): void => {
								copyNodesActionCallback && copyNodesActionCallback();
								resetAll();
								closeModal(modalId);
							}}
							nodesToCopy={nodes}
							folderId={fromFolder}
						/>
					)
				},
				true
			);
		},
		[createModal, resetCurrent, resetAll, closeModal, copyNodesActionCallback]
	);

	return { openCopyNodesModal };
}
