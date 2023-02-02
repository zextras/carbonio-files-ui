/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { QueryResult, useQuery } from '@apollo/client';

import GET_PERMISSIONS from '../../../graphql/queries/getPermissions.graphql';
import { GetPermissionsQuery, GetPermissionsQueryVariables } from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

type GetPermissionsQueryHook = Pick<QueryResult<GetPermissionsQuery>, 'data' | 'loading' | 'error'>;

export function useGetPermissionsQuery(nodeId: string): GetPermissionsQueryHook {
	const { data, loading, error } = useQuery<GetPermissionsQuery, GetPermissionsQueryVariables>(
		GET_PERMISSIONS,
		{
			variables: {
				node_id: nodeId
			},
			skip: !nodeId
		}
	);

	useErrorHandler(error, 'GET_PERMISSIONS');

	return { data, loading, error };
}
