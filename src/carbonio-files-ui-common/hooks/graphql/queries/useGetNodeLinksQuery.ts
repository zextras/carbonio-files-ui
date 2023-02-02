/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { QueryResult, useQuery } from '@apollo/client';

import GET_NODE_LINKS from '../../../graphql/queries/getNodeLinks.graphql';
import { GetNodeLinksQuery, GetNodeLinksQueryVariables } from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export function useGetNodeLinksQuery(
	nodeId: string
): Pick<QueryResult<GetNodeLinksQuery>, 'data' | 'loading' | 'error'> {
	const { data, loading, error } = useQuery<GetNodeLinksQuery, GetNodeLinksQueryVariables>(
		GET_NODE_LINKS,
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
	useErrorHandler(error, 'GET_NODE_LINKS');

	return { data, loading, error };
}
