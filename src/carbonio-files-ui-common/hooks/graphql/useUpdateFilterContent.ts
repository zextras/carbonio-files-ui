/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { ApolloClient, NormalizedCacheObject, useApolloClient } from '@apollo/client';
import { filter, size } from 'lodash';

import { FindNodesCachedObject } from '../../types/apollo';

type FilterMatchCondition = (existingRefs: FindNodesCachedObject) => boolean;

type UpdateFilterContentReturnType = {
	removeNodesFromFilter: (
		nodeIdsToRemove: string[],
		filterMatchCondition: FilterMatchCondition
	) => void;
};

export const useUpdateFilterContent = (
	apolloClientArg?: ApolloClient<NormalizedCacheObject>
): UpdateFilterContentReturnType => {
	const apolloClient = useApolloClient(apolloClientArg);

	const removeNodesFromFilter = useCallback<UpdateFilterContentReturnType['removeNodesFromFilter']>(
		(nodeIdsToRemove, filterMatchCondition) => {
			const { cache } = apolloClient;
			cache.modify({
				fields: {
					findNodes(
						existingNodesRefs: FindNodesCachedObject | undefined,
						{ readField, DELETE }
					): FindNodesCachedObject | undefined {
						if (existingNodesRefs && filterMatchCondition(existingNodesRefs)) {
							const ordered = filter(existingNodesRefs.nodes?.ordered, (orderedNode) => {
								const id = readField<string>('id', orderedNode);
								return id !== undefined && !nodeIdsToRemove.includes(id);
							});
							const unOrdered = filter(existingNodesRefs.nodes?.unOrdered, (unOrderedNode) => {
								const id = readField<string>('id', unOrderedNode);
								return id !== undefined && !nodeIdsToRemove.includes(id);
							});

							if (existingNodesRefs.page_token && size(ordered) === 0 && size(unOrdered) === 0) {
								return DELETE;
							}

							return {
								args: existingNodesRefs.args,
								page_token: existingNodesRefs.page_token,
								nodes: {
									ordered,
									unOrdered
								}
							};
						}
						// if no update is needed, return existing data (new requests are handled with navigation)
						return existingNodesRefs;
					}
				}
			});
		},
		[apolloClient]
	);

	return { removeNodesFromFilter };
};
