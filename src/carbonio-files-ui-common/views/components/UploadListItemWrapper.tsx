/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { useActiveNode } from '../../../hooks/useActiveNode';
import { useGetBaseNodeQuery } from '../../hooks/graphql/queries/useGetBaseNodeQuery';
import { useUploadActions } from '../../hooks/useUploadActions';
import { UploadItem } from '../../types/graphql/client-types';
import { isUploadFolderItem } from '../../utils/uploadUtils';
import { UploadListItem } from './UploadListItem';

interface UploadListItemWrapperProps {
	node: UploadItem;
	isSelected: boolean;
	isSelectionModeActive: boolean;
	selectId: (id: string) => void;
}

export const UploadListItemWrapper = React.memo<UploadListItemWrapperProps>(
	({ node, isSelected, isSelectionModeActive, selectId }) => {
		const permittedUploadActionItems = useUploadActions([node]);

		const { data: parentData } = useGetBaseNodeQuery(node.parentNodeId || '');

		const { setActiveNode, activeNodeId } = useActiveNode();

		const setActive = useCallback(() => {
			setActiveNode(node.id);
		}, [node.id, setActiveNode]);

		return (
			<UploadListItem
				id={node.id}
				nodeId={node.nodeId || undefined}
				name={node.name}
				mimeType={node.file?.type || ''}
				size={(!isUploadFolderItem(node) && node.file?.size) || undefined}
				status={node.status}
				progress={node.progress}
				contentCount={isUploadFolderItem(node) ? node.contentCount : undefined}
				parent={parentData?.getNode}
				isSelected={isSelected}
				selectId={selectId}
				isSelectionModeActive={isSelectionModeActive}
				permittedHoverBarActionItems={permittedUploadActionItems}
				permittedContextualMenuActionItems={permittedUploadActionItems}
				isActive={activeNodeId === node.id}
				setActive={setActive}
			/>
		);
	}
);

UploadListItemWrapper.displayName = 'UploadListItemWrapper';
