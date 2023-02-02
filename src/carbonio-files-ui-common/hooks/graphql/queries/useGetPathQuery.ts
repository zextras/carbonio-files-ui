/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { QueryResult, useQuery } from '@apollo/client';

import GET_PATH from '../../../graphql/queries/getPath.graphql';
import { GetPathQuery, GetPathQueryVariables } from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

/**
 * Can return error: ErrorCode.FILE_VERSION_NOT_FOUND, ErrorCode.NODE_NOT_FOUND
 */
export const useGetPathQuery = (
	nodeId?: string
): Pick<QueryResult<GetPathQuery>, 'data' | 'loading' | 'error'> => {
	const { data, loading, error } = useQuery<GetPathQuery, GetPathQueryVariables>(GET_PATH, {
		variables: {
			node_id: nodeId || ''
		},
		skip: !nodeId
	});
	useErrorHandler(error, 'GET_PATH');

	return { data, loading, error };
};
