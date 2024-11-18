/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';
import { useSnackbar } from '@zextras/carbonio-design-system';
import { forEach, map, some } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { useActiveNode } from '../../../../hooks/useActiveNode';
import { useNavigation } from '../../../../hooks/useNavigation';
import MOVE_NODES from '../../../graphql/mutations/moveNodes.graphql';
import GET_CHILDREN from '../../../graphql/queries/getChildren.graphql';
import { Node, URLParams } from '../../../types/common';
import {
	Folder,
	GetChildrenQuery,
	GetChildrenQueryVariables,
	GetPathDocument,
	GetPathQueryVariables,
	MoveNodesMutation,
	MoveNodesMutationVariables,
	QueryGetPathArgs
} from '../../../types/graphql/types';
import { DeepPick } from '../../../types/utils';
import { isFolder } from '../../../utils/utils';
import { useErrorHandler } from '../../useErrorHandler';
import useQueryParam from '../../useQueryParam';
import { useUpdateFolderContent } from '../useUpdateFolderContent';
import { isOperationVariables, isQueryResult } from '../utils';

export type MoveNodesType = (
	destinationFolder: Pick<Folder, '__typename' | 'id'>,
	...nodes: Array<Node<'id'> & DeepPick<Node<'parent'>, 'parent', 'id' | '__typename'>>
) => Promise<FetchResult<MoveNodesMutation>>;

/**
 * Can return error: ErrorCode.NODE_WRITE_ERROR
 */
export function useMoveNodesMutation(): { moveNodes: MoveNodesType; loading: boolean } {
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();
	const { activeNodeId, removeActiveNode } = useActiveNode();
	const folderIdQueryParam = useQueryParam('folder');
	const { rootId } = useParams<URLParams>();
	const currentFolderId = folderIdQueryParam || rootId;
	const { removeNodesFromFolder } = useUpdateFolderContent();
	const { navigateToFolder } = useNavigation();

	const [moveNodesMutation, { error, loading }] = useMutation<
		MoveNodesMutation,
		MoveNodesMutationVariables
	>(MOVE_NODES, {
		errorPolicy: 'all',
		onCompleted({ moveNodes: moveNodesResult }) {
			if (moveNodesResult) {
				createSnackbar({
					key: new Date().toLocaleString(),
					severity: 'info',
					label: t('snackbar.moveNodes.success', 'Item moved'),
					replace: true,
					actionLabel: t('snackbar.moveNodes.action', 'Go to folder'),
					onActionClick: () => {
						moveNodesResult[0].parent && navigateToFolder(moveNodesResult[0].parent.id);
					}
				});
			} else {
				createSnackbar({
					key: new Date().toLocaleString(),
					severity: 'error',
					label: t('snackbar.moveNodes.error', 'Something went wrong, try again'),
					replace: true,
					hideButton: true
				});
			}
		}
	});
	useErrorHandler(error, 'MOVE_NODES');

	const moveNodes = useCallback<MoveNodesType>(
		async (destinationFolder, ...nodes) => {
			const nodesIds = map(nodes, 'id');

			return moveNodesMutation({
				variables: {
					node_ids: nodesIds,
					destination_id: destinationFolder.id
				},
				update(cache, { data: result }) {
					// remove nodes from previous parents
					const parents: Record<string, Pick<Folder, 'id' | '__typename'>> = {};
					const nodesByParent: Record<string, string[]> = {};
					forEach(result?.moveNodes, (movedNode) => {
						const fromParent = nodes.find((node) => node.id === movedNode.id)?.parent;
						if (fromParent && isFolder(fromParent) && movedNode.parent?.id !== fromParent.id) {
							if (fromParent.id in parents) {
								nodesByParent[fromParent.id].push(movedNode.id);
							} else {
								parents[fromParent.id] = fromParent;
								nodesByParent[fromParent.id] = [movedNode.id];
							}
						}
						const getPathArgs: QueryGetPathArgs = { node_id: movedNode.id };
						cache.evict({
							fieldName: 'getPath',
							args: getPathArgs
						});
					});

					forEach(nodesByParent, (nodeIds, parentId) => {
						removeNodesFromFolder(parents[parentId], nodeIds);
					});

					// clear cached children for destination folder
					cache.evict({ id: cache.identify(destinationFolder), fieldName: 'children' });
					cache.gc();
				},
				onQueryUpdated(observableQuery, { result }) {
					const { query, variables } = observableQuery.options;
					if (
						isOperationVariables<GetPathQueryVariables>(query, variables, GetPathDocument) &&
						variables.node_id === destinationFolder.id
					) {
						// avoid refetch getPath for the destination (folder content opened inside move modal)
						return false;
					}
					if (
						isOperationVariables<GetChildrenQueryVariables>(query, variables, GET_CHILDREN) &&
						variables.node_id === destinationFolder.id
					) {
						// avoid refetch getNode for the destination if destination is not the opened folder inside main list (folder content opened inside move modal)
						return currentFolderId === destinationFolder.id;
					}

					if (
						isQueryResult<GetChildrenQuery>(query, result, GET_CHILDREN) &&
						result?.getNode &&
						isFolder(result.getNode) &&
						result.getNode.id === currentFolderId
					) {
						const listNodes = result.getNode.children?.nodes;
						if (activeNodeId && !some(listNodes, (resultNode) => resultNode?.id === activeNodeId)) {
							// close displayer of the node if it is removed from list
							removeActiveNode();
						}
					}
					// otherwise, stick to the fetch policy set for the query
					return observableQuery.reobserve();
				}
			});
		},
		[activeNodeId, currentFolderId, moveNodesMutation, removeActiveNode, removeNodesFromFolder]
	);

	return { moveNodes, loading };
}
