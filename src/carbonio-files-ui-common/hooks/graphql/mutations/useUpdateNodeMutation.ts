/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { ApolloError, FetchResult, useMutation, useReactiveVar } from '@apollo/client';
import { useParams } from 'react-router-dom';

import { nodeSortVar } from '../../../apollo/nodeSortVar';
import UPDATE_NODE from '../../../graphql/mutations/updateNode.graphql';
import GET_CHILDREN from '../../../graphql/queries/getChildren.graphql';
import {
	GetChildrenQuery,
	GetChildrenQueryVariables,
	UpdateNodeMutation,
	UpdateNodeMutationVariables
} from '../../../types/graphql/types';
import { scrollToNodeItem } from '../../../utils/utils';
import { useErrorHandler } from '../../useErrorHandler';
import useQueryParam from '../../useQueryParam';
import { useUpdateFolderContent } from '../useUpdateFolderContent';

export type UpdateNodeType = (id: string, name: string) => Promise<FetchResult<UpdateNodeMutation>>;

/**
 * Can return error: ErrorCode.FILE_VERSION_NOT_FOUND, ErrorCode.NODE_NOT_FOUND
 */
export function useUpdateNodeMutation(): [
	updateNode: UpdateNodeType,
	updateNodeError: ApolloError | undefined
] {
	const [updateNodeMutation, { error: updateNodeError }] = useMutation<
		UpdateNodeMutation,
		UpdateNodeMutationVariables
	>(UPDATE_NODE);

	useErrorHandler(updateNodeError, 'UPDATE_NODE');

	const { addNodeToFolder } = useUpdateFolderContent();

	const nodeSort = useReactiveVar(nodeSortVar);

	const rootId = useParams<{ rootId: string }>();
	const folderId = useQueryParam('folder');

	const updateNode: UpdateNodeType = useCallback(
		(id: string, name: string) =>
			updateNodeMutation({
				variables: {
					node_id: id,
					name
				},
				// after the mutation returns a response
				// update the position of the node in cache
				update(cache, { data }) {
					if (data?.updateNode) {
						const updatedNode = data.updateNode;
						// if updated node has a parent, check if parent has children in cache
						// and update node position in parent cached children
						if (updatedNode.parent) {
							const parentFolder = cache.readQuery<GetChildrenQuery, GetChildrenQueryVariables>({
								query: GET_CHILDREN,
								variables: {
									node_id: updatedNode.parent.id,
									// load all cached children
									children_limit: Number.MAX_SAFE_INTEGER,
									sort: nodeSort
								}
							});
							if (parentFolder?.getNode?.__typename === 'Folder') {
								const parentNode = parentFolder.getNode;
								const { isLast } = addNodeToFolder(parentNode, updatedNode);
								const currentFolder = folderId || rootId;
								if (parentNode.id === currentFolder) {
									scrollToNodeItem(updatedNode.id, isLast);
								}
							}
						}
						return Promise.resolve(true);
					}
					return Promise.reject(new Error('update node result is empty'));
				}
			}),
		[updateNodeMutation, nodeSort, addNodeToFolder, folderId, rootId]
	);

	return [updateNode, updateNodeError];
}
