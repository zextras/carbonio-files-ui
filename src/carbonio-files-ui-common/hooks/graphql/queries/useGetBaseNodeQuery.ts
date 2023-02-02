/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { QueryResult, useQuery } from '@apollo/client';

import GET_BASE_NODE from '../../../graphql/queries/getBaseNode.graphql';
import { GetBaseNodeQuery, GetBaseNodeQueryVariables } from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

type GetBaseNodeQueryHook = Pick<QueryResult<GetBaseNodeQuery>, 'data' | 'loading' | 'error'>;

/**
 * Can return error: ErrorCode.FILE_VERSION_NOT_FOUND, ErrorCode.NODE_NOT_FOUND
 */
export function useGetBaseNodeQuery(nodeId?: string): GetBaseNodeQueryHook {
	const { data, loading, error } = useQuery<GetBaseNodeQuery, GetBaseNodeQueryVariables>(
		GET_BASE_NODE,
		{
			variables: {
				node_id: nodeId || ''
			},
			skip: !nodeId,
			notifyOnNetworkStatusChange: true,
			returnPartialData: true,
			errorPolicy: 'all'
		}
	);
	useErrorHandler(error, 'GET_BASE_NODE');

	return { data, loading, error };
}
