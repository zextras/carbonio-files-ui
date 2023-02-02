/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback, useMemo } from 'react';

import { QueryOptions, QueryResult, useQuery, useReactiveVar } from '@apollo/client';

import { nodeSortVar } from '../../../apollo/nodeSortVar';
import { NODES_LOAD_LIMIT, SHARES_LOAD_LIMIT } from '../../../constants';
import GET_NODE from '../../../graphql/queries/getNode.graphql';
import { GetNodeQuery, GetNodeQueryVariables } from '../../../types/graphql/types';
import { isFolder } from '../../../utils/utils';
import { useErrorHandler } from '../../useErrorHandler';

interface GetNodeQueryHook extends Pick<QueryResult<GetNodeQuery>, 'data' | 'loading' | 'error'> {
	loadMore: () => void;
	hasMore: boolean;
	pageToken: string | null | undefined;
}

/**
 * Can return error: ErrorCode.FILE_VERSION_NOT_FOUND, ErrorCode.NODE_NOT_FOUND
 */
export function useGetNodeQuery(
	nodeId?: string,
	sharesLimit = SHARES_LOAD_LIMIT,
	options: Omit<
		QueryOptions<GetNodeQuery, GetNodeQueryVariables>,
		'query' | 'variables' | 'skip'
	> = {}
): GetNodeQueryHook {
	const nodeSort = useReactiveVar(nodeSortVar);
	const { data, loading, error, fetchMore } = useQuery<GetNodeQuery, GetNodeQueryVariables>(
		GET_NODE,
		{
			variables: {
				node_id: nodeId || '',
				children_limit: NODES_LOAD_LIMIT,
				sort: nodeSort,
				shares_limit: sharesLimit
			},
			skip: !nodeId,
			notifyOnNetworkStatusChange: true,
			errorPolicy: 'all',
			...options
		}
	);
	useErrorHandler(error, 'GET_NODE');

	const { hasMore, pageToken } = useMemo(
		() => ({
			hasMore:
				!!data?.getNode &&
				isFolder(data.getNode) &&
				data.getNode.children &&
				data.getNode.children.page_token !== null,
			pageToken:
				data?.getNode && isFolder(data.getNode) && data.getNode.children
					? data.getNode.children.page_token
					: undefined
		}),
		[data?.getNode]
	);

	const loadMore = useCallback(() => {
		fetchMore<GetNodeQuery, GetNodeQueryVariables>({
			variables: {
				page_token: pageToken
			}
		}).catch((err) => {
			console.error(err);
		});
	}, [pageToken, fetchMore]);

	return { data, loading, error, loadMore, hasMore, pageToken };
}
