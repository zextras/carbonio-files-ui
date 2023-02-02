/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';
import { useSnackbar } from '@zextras/carbonio-design-system';
import { forEach, map, find, some } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useActiveNode } from '../../../../hooks/useActiveNode';
import FLAG_NODES from '../../../graphql/mutations/flagNodes.graphql';
import FIND_NODES from '../../../graphql/queries/findNodes.graphql';
import { PickIdNodeType } from '../../../types/common';
import {
	FindNodesQuery,
	FlagNodesMutation,
	FlagNodesMutationVariables
} from '../../../types/graphql/types';
import { isSearchView } from '../../../utils/utils';
import { useErrorHandler } from '../../useErrorHandler';
import { useUpdateFilterContent } from '../useUpdateFilterContent';
import { isQueryResult } from '../utils';

export type FlagNodesType = (
	flagValue: boolean,
	...nodes: PickIdNodeType[]
) => Promise<FetchResult<FlagNodesMutation>>;

/**
 * Mutation to update the flag for one or more nodes.
 * Use an optimistic response to update the cache.
 * Receive an optional callback as param to perform additional context-specific updates.
 *
 */

export function useFlagNodesMutation(): FlagNodesType {
	const location = useLocation();
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();
	const { activeNodeId, removeActiveNode } = useActiveNode();
	const { removeNodesFromFilter } = useUpdateFilterContent();
	const [flagNodesMutation, { error }] = useMutation<FlagNodesMutation, FlagNodesMutationVariables>(
		FLAG_NODES,
		{
			errorPolicy: 'all'
		}
	);

	const flagNodes: FlagNodesType = useCallback(
		(flagValue: boolean, ...nodes: PickIdNodeType[]) => {
			const nodesIds: string[] = map(nodes, (node: PickIdNodeType) => node.id);

			return flagNodesMutation({
				variables: {
					node_ids: nodesIds,
					flag: flagValue
				},
				optimisticResponse: {
					__typename: 'Mutation',
					flagNodes: nodesIds
				},
				update(cache, { data }) {
					if (data?.flagNodes) {
						const flaggedNodes = data.flagNodes;
						// update single node
						forEach(flaggedNodes, (id) => {
							const node = find(nodes, ['id', id]);
							if (node) {
								cache.modify({
									id: cache.identify(node),
									fields: {
										flagged(): boolean {
											return flagValue;
										}
									}
								});
							}
						});
						// update flagged filter list
						removeNodesFromFilter(
							flaggedNodes,
							(existingRefs) =>
								existingRefs?.args?.flagged === true && !flagValue && !isSearchView(location)
						);
					}
				},
				onQueryUpdated(observableQuery, { missing, result }) {
					const { query } = observableQuery.options;
					let listNodes: Array<PickIdNodeType | null> | undefined;
					if (isQueryResult<FindNodesQuery>(query, result, FIND_NODES)) {
						listNodes = result.findNodes?.nodes;
						if (
							some(
								nodesIds,
								(nodeId) => !some(listNodes, (resultNode) => resultNode?.id === nodeId)
							)
						) {
							// if there is some node that is removed from the list show a success snackbar
							createSnackbar({
								key: new Date().toLocaleString(),
								type: 'info',
								label: t('snackbar.unflag.success', 'Item unflagged successfully'),
								replace: true,
								hideButton: true
							});
							if (
								activeNodeId &&
								!some(listNodes, (resultNode) => resultNode?.id === activeNodeId)
							) {
								// close displayer if node is removed from the list
								removeActiveNode();
							}
						}
						if (missing) {
							return observableQuery.refetch();
						}
					}
					return observableQuery.reobserve();
				}
			});
		},
		[
			activeNodeId,
			createSnackbar,
			flagNodesMutation,
			location,
			removeActiveNode,
			removeNodesFromFilter,
			t
		]
	);

	useErrorHandler(error, 'FLAG_NODES');

	return flagNodes;
}
