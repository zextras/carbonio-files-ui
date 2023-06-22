/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { QueryResult, useQuery } from '@apollo/client';

import {
	GetLinksDocument,
	GetLinksQuery,
	GetLinksQueryVariables
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export function useGetLinksQuery(
	nodeId: string
): Pick<QueryResult<GetLinksQuery>, 'data' | 'loading' | 'error'> {
	const { data, loading, error } = useQuery<GetLinksQuery, GetLinksQueryVariables>(
		GetLinksDocument,
		{
			variables: {
				node_id: nodeId
			},
			skip: !nodeId,
			notifyOnNetworkStatusChange: true,
			errorPolicy: 'all',
			returnPartialData: true
		}
	);
	useErrorHandler(error, 'GET_LINKS');

	return { data, loading, error };
}
