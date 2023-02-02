/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { QueryResult, useQuery } from '@apollo/client';

import { FULL_SHARES_LOAD_LIMIT } from '../../../constants';
import GET_SHARES from '../../../graphql/queries/getShares.graphql';
import { GetSharesQuery, GetSharesQueryVariables } from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

/**
 * Can return error: ErrorCode.SHARE_NOT_FOUND
 */
export function useGetSharesQuery(
	nodeId?: string
): Pick<QueryResult<GetSharesQuery>, 'data' | 'loading' | 'error'> {
	const { data, loading, error } = useQuery<GetSharesQuery, GetSharesQueryVariables>(GET_SHARES, {
		variables: {
			node_id: nodeId || '',
			shares_limit: FULL_SHARES_LOAD_LIMIT
		},
		skip: !nodeId,
		notifyOnNetworkStatusChange: true,
		errorPolicy: 'all',
		returnPartialData: true
	});

	useErrorHandler(error, 'GET_SHARES');

	return { data, loading, error };
}
