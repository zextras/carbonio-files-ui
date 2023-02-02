/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { QueryResult, useQuery } from '@apollo/client';

import GET_VERSIONS from '../../../graphql/queries/getVersions.graphql';
import { GetVersionsQuery, GetVersionsQueryVariables } from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export function useGetVersionsQuery(
	id: string,
	versions?: Array<number>
): Pick<QueryResult<GetVersionsQuery>, 'data' | 'loading' | 'error'> {
	const { data, loading, error } = useQuery<GetVersionsQuery, GetVersionsQueryVariables>(
		GET_VERSIONS,
		{
			variables: {
				node_id: id,
				versions
			},
			skip: !id,
			notifyOnNetworkStatusChange: true
		}
	);
	useErrorHandler(error, 'GET_VERSIONS');

	return { data, loading, error };
}
