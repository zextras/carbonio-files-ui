/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';
import { useSnackbar } from '@zextras/carbonio-design-system';
import { forEach, map, find, partition, some } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useActiveNode } from '../../../../hooks/useActiveNode';
import { useNavigation } from '../../../../hooks/useNavigation';
import useUserInfo from '../../../../hooks/useUserInfo';
import { ROOTS, INTERNAL_PATH, FILTER_TYPE } from '../../../constants';
import PARENT_ID from '../../../graphql/fragments/parentId.graphql';
import TRASH_NODES from '../../../graphql/mutations/trashNodes.graphql';
import FIND_NODES from '../../../graphql/queries/findNodes.graphql';
import GET_CHILDREN from '../../../graphql/queries/getChildren.graphql';
import { PickIdNodeType } from '../../../types/common';
import {
	FindNodesQuery,
	Folder,
	GetChildrenQuery,
	Node,
	ParentIdFragment,
	QueryGetPathArgs,
	TrashNodesMutation,
	TrashNodesMutationVariables
} from '../../../types/graphql/types';
import { DeepPick } from '../../../types/utils';
import { isFolder, isSearchView } from '../../../utils/utils';
import { useErrorHandler } from '../../useErrorHandler';
import { useUpload } from '../../useUpload';
import { useUpdateFilterContent } from '../useUpdateFilterContent';
import { useUpdateFolderContent } from '../useUpdateFolderContent';
import { isQueryResult } from '../utils';

export type TrashNodesType = (
	...nodes: Array<PickIdNodeType & DeepPick<Node, 'owner', 'id'>>
) => Promise<FetchResult<TrashNodesMutation>>;

/**
 * Mutation to mark for deletion for one or more nodes.
 * Use an optimistic response to update the cache
 * Can return error: ErrorCode.NODE_WRITE_ERROR
 */
export function useTrashNodesMutation(): TrashNodesType {
	const createSnackbar = useSnackbar();
	const { removeByNodeId } = useUpload();
	const [t] = useTranslation();
	const { navigateTo } = useNavigation();
	const { activeNodeId, removeActiveNode } = useActiveNode();
	const { removeNodesFromFolder } = useUpdateFolderContent();
	const { removeNodesFromFilter } = useUpdateFilterContent();
	const location = useLocation();

	const [trashNodesMutation, { error }] = useMutation<
		TrashNodesMutation,
		TrashNodesMutationVariables
	>(TRASH_NODES, {
		errorPolicy: 'all'
	});

	useErrorHandler(error, 'TRASH_NODES');

	const { me: loggedUser } = useUserInfo();

	const trashNodes: TrashNodesType = useCallback(
		(...nodes) => {
			const nodesIds = map(nodes, (node) => node.id);

			return trashNodesMutation({
				variables: {
					node_ids: nodesIds
				},
				optimisticResponse: {
					__typename: 'Mutation',
					trashNodes: nodesIds
				},
				update(cache, { data }) {
					if (data?.trashNodes) {
						const trashedNodes = data.trashNodes;
						removeNodesFromFilter(
							trashedNodes,
							(existingRefs) =>
								existingRefs.args?.folder_id !== ROOTS.TRASH && !isSearchView(location)
						);

						const parents: Record<string, Pick<Folder, 'id' | '__typename'>> = {};
						const nodesByParent: Record<string, string[]> = {};
						forEach(data.trashNodes, (id) => {
							const node = find(nodes, ['id', id]);
							if (node) {
								const parentFolder = cache.readFragment<ParentIdFragment>({
									id: cache.identify(node),
									fragment: PARENT_ID
								});

								if (parentFolder?.parent) {
									const { parent } = parentFolder;
									if (parent.id in parents) {
										nodesByParent[parent.id].push(id);
									} else {
										parents[parent.id] = parent as Pick<Folder, '__typename' | 'id'>;
										nodesByParent[parent.id] = [id];
									}
								}

								cache.modify({
									id: cache.identify(node),
									fields: {
										rootId(): string {
											return ROOTS.TRASH;
										}
									}
								});

								const getPathArgs: QueryGetPathArgs = { node_id: node.id };
								cache.evict({
									fieldName: 'getPath',
									args: getPathArgs
								});
								cache.gc();
							}
						});
						forEach(nodesByParent, (nodeIds, parentId) => {
							removeNodesFromFolder(parents[parentId], nodeIds);
						});
					}
				},
				onQueryUpdated(observableQuery, { missing, result }) {
					const { query } = observableQuery.options;
					let listNodes = null;
					if (isQueryResult<FindNodesQuery>(query, result, FIND_NODES)) {
						if (missing) {
							return observableQuery.refetch();
						}
						listNodes = result.findNodes?.nodes;
					}
					if (
						isQueryResult<GetChildrenQuery>(query, result, GET_CHILDREN) &&
						result.getNode &&
						isFolder(result.getNode)
					) {
						listNodes = result.getNode.children?.nodes;
					}

					if (
						observableQuery.hasObservers() &&
						activeNodeId &&
						listNodes &&
						!some<Pick<Node, 'id'> | null>(
							listNodes,
							(resultNode) => resultNode?.id === activeNodeId
						)
					) {
						removeActiveNode();
					}
					return observableQuery.reobserve();
				}
			}).then(({ data }) => {
				if (data?.trashNodes) {
					removeByNodeId(data.trashNodes);
					const [ownedNodes, sharedNodes] = partition(
						nodes,
						(node) => node.owner.id === loggedUser
					);
					createSnackbar({
						key: new Date().toLocaleString(),
						type: 'info',
						label: t('snackbar.markForDeletion.success', 'Item moved to trash'),
						replace: true,
						hideButton: ownedNodes.length > 0 && sharedNodes.length > 0,
						onActionClick: () => {
							navigateTo(
								ownedNodes.length > 0
									? `${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`
									: `${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedTrash}`
							);
						},
						actionLabel: t('snackbar.markForDeletion.showTrash', 'Open Trash Folder')
					});
				}
				return { data };
			});
		},
		[
			trashNodesMutation,
			removeNodesFromFilter,
			location,
			removeNodesFromFolder,
			activeNodeId,
			removeActiveNode,
			removeByNodeId,
			createSnackbar,
			t,
			loggedUser,
			navigateTo
		]
	);

	return trashNodes;
}
