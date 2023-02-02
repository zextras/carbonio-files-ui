/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { QueryResult, useQuery } from '@apollo/client';

import GET_ROOTS_LIST from '../../../graphql/queries/getRootsList.graphql';
import { GetRootsListQuery, GetRootsListQueryVariables } from '../../../types/graphql/types';

export function useGetRootsListQuery(): Pick<
	QueryResult<GetRootsListQuery>,
	'data' | 'loading' | 'error'
> {
	const { data, loading, error } = useQuery<GetRootsListQuery, GetRootsListQueryVariables>(
		GET_ROOTS_LIST,
		{
			notifyOnNetworkStatusChange: true
		}
	);

	return { data, loading, error };
}
