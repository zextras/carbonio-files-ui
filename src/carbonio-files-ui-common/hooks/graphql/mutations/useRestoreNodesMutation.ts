/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';
import { useSnackbar } from '@zextras/carbonio-design-system';
import { forEach, map, filter, reduce, size, some } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useActiveNode } from '../../../../hooks/useActiveNode';
import { useNavigation } from '../../../../hooks/useNavigation';
import { ROOTS } from '../../../constants';
import RESTORE_NODES from '../../../graphql/mutations/restoreNodes.graphql';
import FIND_NODES from '../../../graphql/queries/findNodes.graphql';
import { GetNodeParentType, Node } from '../../../types/common';
import {
	FindNodesQuery,
	QueryGetPathArgs,
	RestoreNodesMutation,
	RestoreNodesMutationVariables
} from '../../../types/graphql/types';
import { isSearchView } from '../../../utils/utils';
import { useErrorHandler } from '../../useErrorHandler';
import { useUpdateFilterContent } from '../useUpdateFilterContent';
import { isQueryResult } from '../utils';

type UseRestoreRequiredNodeType = Pick<Node, 'id' | '__typename'> & GetNodeParentType;

export type RestoreType = (
	...nodes: UseRestoreRequiredNodeType[]
) => Promise<FetchResult<RestoreNodesMutation>>;

/**
 * Mutation to restore one or more nodes.
 * Use an optimistic response to update the cache
 * Can return error: ErrorCode.NODE_WRITE_ERROR
 */
export function useRestoreNodesMutation(): RestoreType {
	const createSnackbar = useSnackbar();
	const [t] = useTranslation();
	const { navigateToFolder } = useNavigation();
	const location = useLocation();
	const { activeNodeId, removeActiveNode } = useActiveNode();
	const { removeNodesFromFilter } = useUpdateFilterContent();
	const [restoreNodesMutation, { error }] = useMutation<
		RestoreNodesMutation,
		RestoreNodesMutationVariables
	>(RESTORE_NODES, {
		errorPolicy: 'all'
	});

	useErrorHandler(error, 'RESTORE_NODES');

	const restoreNodes: RestoreType = useCallback(
		(...nodes: UseRestoreRequiredNodeType[]) => {
			const nodesIds: string[] = map(nodes, (node: UseRestoreRequiredNodeType) => node.id);

			return restoreNodesMutation({
				variables: {
					node_ids: nodesIds
				},
				optimisticResponse: {
					__typename: 'Mutation',
					restoreNodes: map(nodes, (node) => ({ ...node, parent: null, rootId: ROOTS.LOCAL_ROOT }))
				},
				update(cache, { data }) {
					if (data?.restoreNodes) {
						const restoredNodes = filter<
							typeof data.restoreNodes[number],
							NonNullable<typeof data.restoreNodes[number]>
						>(data.restoreNodes, (node): node is NonNullable<typeof node> => !!node);
						removeNodesFromFilter(
							map(restoredNodes, (restoredNode) => restoredNode.id),
							(existingRefs) =>
								existingRefs.args?.folder_id === ROOTS.TRASH && !isSearchView(location)
						);

						forEach(restoredNodes, (node) => {
							if (node?.parent) {
								// clear cached children for destination folder
								cache.evict({ id: cache.identify(node.parent), fieldName: 'children' });
							}

							const getPathArgs: QueryGetPathArgs = { node_id: node.id };
							cache.evict({
								fieldName: 'getPath',
								args: getPathArgs
							});

							cache.gc();
						});
					}
				},
				onQueryUpdated(observableQuery, { missing, result }) {
					const { query } = observableQuery.options;
					if (isQueryResult<FindNodesQuery>(query, result, FIND_NODES)) {
						if (missing) {
							return observableQuery.refetch();
						}
						const listNodes = result.findNodes?.nodes;
						if (activeNodeId && !some(listNodes, (resultNode) => resultNode?.id === activeNodeId)) {
							removeActiveNode();
						}
					}

					return observableQuery.reobserve();
				}
			}).then((result) => {
				if (result?.data?.restoreNodes && size(result?.data?.restoreNodes) === size(nodes)) {
					const parents = reduce(
						result.data.restoreNodes,
						(parentList, restoredNode) => {
							if (restoredNode?.parent && !parentList.includes(restoredNode.parent.id)) {
								parentList.push(restoredNode.parent.id);
							}
							return parentList;
						},
						[] as string[]
					);
					createSnackbar({
						key: new Date().toLocaleString(),
						type: 'info',
						label: t('snackbar.restore.success', 'Success'),
						replace: true,
						onActionClick: () => {
							if (parents.length === 1) {
								navigateToFolder(parents[0]);
							}
						},
						actionLabel: t('snackbar.restore.showInFolder', 'Show in folder'),
						// show action button only if all nodes have the same parent
						hideButton: parents.length !== 1
					});
				}
				return result;
			});
		},
		[
			restoreNodesMutation,
			removeNodesFromFilter,
			location,
			activeNodeId,
			removeActiveNode,
			createSnackbar,
			t,
			navigateToFolder
		]
	);

	return restoreNodes;
}
