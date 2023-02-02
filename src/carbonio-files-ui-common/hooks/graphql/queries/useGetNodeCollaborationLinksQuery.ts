/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { QueryResult, useQuery } from '@apollo/client';

import GET_NODE_COLLABORATION_LINKS from '../../../graphql/queries/getNodeCollaborationLinks.graphql';
import {
	GetNodeCollaborationLinksQuery,
	GetNodeCollaborationLinksQueryVariables
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export function useGetNodeCollaborationLinksQuery(
	nodeId: string
): Pick<QueryResult<GetNodeCollaborationLinksQuery>, 'data' | 'loading' | 'error'> {
	const { data, loading, error } = useQuery<
		GetNodeCollaborationLinksQuery,
		GetNodeCollaborationLinksQueryVariables
	>(GET_NODE_COLLABORATION_LINKS, {
		variables: {
			node_id: nodeId
		},
		skip: !nodeId,
		notifyOnNetworkStatusChange: true,
		errorPolicy: 'all',
		returnPartialData: true
	});
	useErrorHandler(error, 'GET_NODE_COLLABORATION_LINKS');

	return { data, loading, error };
}
