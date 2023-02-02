/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { QueryResult, useQuery } from '@apollo/client';

import GET_CHILD from '../../../graphql/queries/getChild.graphql';
import { GetChildQuery, GetChildQueryVariables } from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export function useGetChildQuery(
	nodeId: string
): Pick<QueryResult<GetChildQuery, GetChildQueryVariables>, 'data' | 'error' | 'loading'> {
	const { data, loading, error } = useQuery<GetChildQuery, GetChildQueryVariables>(GET_CHILD, {
		variables: {
			node_id: nodeId || ''
		},
		skip: !nodeId,
		returnPartialData: true,
		errorPolicy: 'all'
	});

	// TODO: show snackbar only after FILES-69 otherwise an error is always shown for the local root
	useErrorHandler(error, 'GET_CHILD', { showSnackbar: false });

	return { data, error, loading };
}
