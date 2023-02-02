/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useMemo } from 'react';

import { CollapsingActions, Container } from '@zextras/carbonio-design-system';
import { map, isEqual, drop } from 'lodash';
import { useTranslation } from 'react-i18next';

import { useActiveNode } from '../../../hooks/useActiveNode';
import { useGetBaseNodeQuery } from '../../hooks/graphql/queries/useGetBaseNodeQuery';
import { useMemoCompare } from '../../hooks/useMemoCompare';
import { useUploadActions } from '../../hooks/useUploadActions';
import { UploadItem } from '../../types/graphql/client-types';
import { NodeType } from '../../types/graphql/types';
import {
	flatUploadItemChildrenIds,
	getUploadNodeType,
	isUploadFolderItem
} from '../../utils/uploadUtils';
import { humanFileSize } from '../../utils/utils';
import { DisplayerHeader } from './DisplayerHeader';
import { NodeContent } from './NodeContent';
import { PathRow, PathRowProps } from './PathRow';
import { DisplayerContentContainer } from './StyledComponents';
import { TextRowWithShim } from './TextRowWithShim';
import { UploadNodeDetailsListItem } from './UploadNodeDetailsListItem';

interface UploadDisplayerNodeProps {
	uploadItem: UploadItem;
}

function UploadDisplayerNodeContent({ id }: { id: string }): JSX.Element {
	// reload children ids each time otherwise remove of sub-items is not detected
	const ids = drop(flatUploadItemChildrenIds(id));
	// then memoized with a deep equality the ids to check if they are changed or not
	const memoIds = useMemoCompare(ids, (prev, next) => isEqual(prev, next));

	const contentItems = useMemo(
		() =>
			map(memoIds, (childItemId) => (
				<UploadNodeDetailsListItem key={childItemId} id={childItemId} />
			)),
		[memoIds]
	);

	return (
		<NodeContent id={id} loading={false} hasMore={false}>
			{contentItems}
		</NodeContent>
	);
}

export const UploadDisplayerNode = ({ uploadItem }: UploadDisplayerNodeProps): JSX.Element => {
	const [t] = useTranslation();
	const { removeActiveNode } = useActiveNode();

	const actions = useUploadActions([uploadItem]);

	const { data: parentData, loading: loadingParent } = useGetBaseNodeQuery(
		uploadItem.parentNodeId || ''
	);

	const parentNode = useMemo<PathRowProps>(() => {
		if (!loadingParent) {
			if (parentData?.getNode) {
				return parentData.getNode;
			}
			const path: string[] = uploadItem.fullPath.split('/');
			if (path.length > 0) {
				if (path.length > 1 && path[path.length - 2].length > 0) {
					return {
						name: path[path.length - 2],
						type: NodeType.Folder,
						rootId: undefined,
						id: uploadItem.parentId || `${uploadItem.id}-parent-${Date.now().toLocaleString()}`
					};
				}
				return {
					name: path[path.length - 1],
					type: NodeType.Other,
					rootId: undefined,
					id: uploadItem.id
				};
			}
		}
		return {
			name: '',
			type: NodeType.Other,
			rootId: undefined,
			id: ''
		};
	}, [loadingParent, parentData, uploadItem.fullPath, uploadItem.id, uploadItem.parentId]);

	return (
		<>
			<DisplayerHeader
				name={uploadItem.file?.name || ''}
				type={getUploadNodeType(uploadItem)}
				closeAction={removeActiveNode}
				mimeType={uploadItem.file?.type}
			/>
			<Container
				orientation="horizontal"
				mainAlignment="flex-end"
				crossAlignment="center"
				height="auto"
				padding={{ horizontal: 'large', vertical: 'small' }}
				data-testid="displayer-actions-header"
			>
				<CollapsingActions actions={actions} />
			</Container>
			<DisplayerContentContainer
				height={'fill'}
				background={'gray5'}
				padding={{ horizontal: 'large' }}
				mainAlignment={'flex-start'}
				data-testid="displayer-content"
			>
				<Container
					mainAlignment={'flex-start'}
					background={'gray5'}
					height={'auto'}
					maxHeight={'100%'}
					data-testid="node-details"
					gap="0.75rem"
				>
					<Container
						mainAlignment={'flex-start'}
						crossAlignment={'flex-start'}
						height={'fit'}
						padding={{ all: 'large' }}
						background={'gray6'}
					>
						{uploadItem.file?.type && (
							<TextRowWithShim
								loading={false}
								label={t('displayer.details.size', 'Size')}
								content={humanFileSize(uploadItem.file.size ?? 0)}
								shimmerWidth="5rem"
							/>
						)}
						<PathRow
							id={parentNode.id}
							name={parentNode.name}
							type={parentNode.type}
							rootId={parentNode.rootId}
						/>
					</Container>
					{isUploadFolderItem(uploadItem) && <UploadDisplayerNodeContent id={uploadItem.id} />}
				</Container>
			</DisplayerContentContainer>
		</>
	);
};
