/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';
import { useSnackbar } from '@zextras/carbonio-design-system';
import { forEach, map } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { useNavigation } from '../../../../hooks/useNavigation';
import { SHARES_LOAD_LIMIT } from '../../../constants';
import { PickIdNodeType } from '../../../types/common';
import { CopyNodesDocument, CopyNodesMutation, Folder } from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';
import useQueryParam from '../../useQueryParam';
import { useUpdateFolderContent } from '../useUpdateFolderContent';

export type CopyNodesType = (
	destinationFolder: Pick<Folder, '__typename' | 'id'>,
	...nodes: Array<PickIdNodeType>
) => Promise<FetchResult<CopyNodesMutation>>;

/**
 * Can return error: ErrorCode.NODE_WRITE_ERROR, ErrorCode.OVER_QUOTA_REACHED
 */
export function useCopyNodesMutation(): { copyNodes: CopyNodesType; loading: boolean } {
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();
	const { rootId } = useParams<{ rootId: string }>();
	const folderId = useQueryParam('folder');
	const { navigateToFolder } = useNavigation();
	const handleError = useErrorHandler(undefined, 'COPY_NODES');
	const [copyNodesMutation, { loading }] = useMutation(CopyNodesDocument, {
		errorPolicy: 'all',
		onCompleted({ copyNodes: copyNodesResult }) {
			if (copyNodesResult && copyNodesResult.length > 0) {
				createSnackbar({
					key: new Date().toLocaleString(),
					severity: 'info',
					label: t('snackbar.copyNodes.success', 'Item copied'),
					replace: true,
					actionLabel: t('snackbar.copyNodes.action', 'Go to folder'),
					onActionClick: () => {
						copyNodesResult[0].parent && navigateToFolder(copyNodesResult[0].parent.id);
					}
				});
			}
		},
		onError(error) {
			handleError(error);
		}
	});

	const { addNodeToFolder } = useUpdateFolderContent();

	const copyNodes = useCallback<CopyNodesType>(
		(destinationFolder, ...nodes) => {
			const nodesIds = map(nodes, 'id');

			return copyNodesMutation({
				variables: {
					node_ids: nodesIds,
					destination_id: destinationFolder.id,
					shares_limit: SHARES_LOAD_LIMIT
				},
				update(cache, { data: result }) {
					const currentFolderId = folderId ?? rootId;
					// clear cached children for destination folder
					if (destinationFolder.id !== currentFolderId) {
						cache.evict({ id: cache.identify(destinationFolder), fieldName: 'children' });
						cache.gc();
					} else {
						// add copied nodes in cached data in right sorted position
						forEach(result?.copyNodes, (newNode) => {
							addNodeToFolder(destinationFolder, newNode);
						});
					}
				}
			});
		},
		[copyNodesMutation, folderId, rootId, addNodeToFolder]
	);
	return { copyNodes, loading };
}
