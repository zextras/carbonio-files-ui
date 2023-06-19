/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { QueryResult, useQuery } from '@apollo/client';

import {
	GetCollaborationLinksDocument,
	GetCollaborationLinksQuery,
	GetCollaborationLinksQueryVariables
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export function useGetCollaborationLinksQuery(
	nodeId: string
): Pick<QueryResult<GetCollaborationLinksQuery>, 'data' | 'loading' | 'error'> {
	const { data, loading, error } = useQuery<
		GetCollaborationLinksQuery,
		GetCollaborationLinksQueryVariables
	>(GetCollaborationLinksDocument, {
		variables: {
			node_id: nodeId
		},
		skip: !nodeId,
		notifyOnNetworkStatusChange: true,
		errorPolicy: 'all',
		returnPartialData: true
	});
	useErrorHandler(error, 'GET_COLLABORATION_LINKS');

	return { data, loading, error };
}
