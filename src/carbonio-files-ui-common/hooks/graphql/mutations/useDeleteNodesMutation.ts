/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';
import { useSnackbar } from '@zextras/carbonio-design-system';
import { map, some } from 'lodash';
import { useTranslation } from 'react-i18next';

import { useActiveNode } from '../../../../hooks/useActiveNode';
import DELETE_NODES from '../../../graphql/mutations/deleteNodes.graphql';
import FIND_NODES from '../../../graphql/queries/findNodes.graphql';
import { PickIdNodeType } from '../../../types/common';
import {
	DeleteNodesMutation,
	DeleteNodesMutationVariables,
	FindNodesQuery
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';
import { useUpdateFilterContent } from '../useUpdateFilterContent';
import { isQueryResult } from '../utils';

export type DeleteNodesType = (
	...nodes: PickIdNodeType[]
) => Promise<FetchResult<DeleteNodesMutation>>;

/**
 * Mutation to delete permanently one or more nodes.
 * Use an optimistic response to update the cache
 * Can return error: ErrorCode.FILE_VERSION_NOT_FOUND, ErrorCode.NODE_NOT_FOUND
 */
export function useDeleteNodesMutation(): DeleteNodesType {
	const createSnackbar = useSnackbar();
	const [t] = useTranslation();
	const [deleteNodesMutation, { error }] = useMutation<
		DeleteNodesMutation,
		DeleteNodesMutationVariables
	>(DELETE_NODES, {
		errorPolicy: 'all'
	});
	const { removeNodesFromFilter } = useUpdateFilterContent();
	const { activeNodeId, removeActiveNode } = useActiveNode();

	useErrorHandler(error, 'DELETE_NODES', { type: 'error' });

	const deleteNodes = useCallback<DeleteNodesType>(
		(...nodes: PickIdNodeType[]) => {
			const nodesIds: string[] = map(nodes, (node: PickIdNodeType) => node.id);

			return deleteNodesMutation({
				variables: {
					node_ids: nodesIds
				},
				optimisticResponse: {
					__typename: 'Mutation',
					deleteNodes: nodesIds
				},
				update(cache, { data }) {
					if (data?.deleteNodes) {
						const deletedNodes = data.deleteNodes;
						// remove deleted nodes from every filter/search
						removeNodesFromFilter(deletedNodes, () => true);
						cache.gc();
					}
				},
				onQueryUpdated(observableQuery, { missing, result }) {
					const { query } = observableQuery.options;
					if (missing) {
						return observableQuery.refetch();
					}
					if (isQueryResult<FindNodesQuery>(query, result, FIND_NODES)) {
						const listNodes = result.findNodes?.nodes;
						if (
							activeNodeId &&
							some(
								nodesIds,
								(nodeId) =>
									nodeId === activeNodeId &&
									!some(listNodes, (resultNode) => resultNode?.id === nodeId)
							)
						) {
							removeActiveNode();
						}
					}
					return observableQuery.reobserve();
				}
			}).then((value) => {
				createSnackbar({
					key: new Date().toLocaleString(),
					type: 'success',
					label: t('snackbar.deletePermanently.success', 'Success'),
					replace: true,
					hideButton: true
				});
				return value;
			});
		},
		[activeNodeId, createSnackbar, deleteNodesMutation, removeActiveNode, removeNodesFromFilter, t]
	);

	return deleteNodes;
}
