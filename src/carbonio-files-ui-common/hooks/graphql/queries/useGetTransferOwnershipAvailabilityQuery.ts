/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { QueryResult, useQuery } from '@apollo/client';

import {
	GetTransferOwnershipAvailabilityDocument,
	GetTransferOwnershipAvailabilityQuery,
	GetTransferOwnershipAvailabilityQueryVariables
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export function useGetTransferOwnershipAvailabilityQuery(
	nodes: Array<{ id: string }>,
	userId?: string
): Pick<QueryResult<GetTransferOwnershipAvailabilityQuery>, 'data' | 'loading' | 'error'> {
	const { data, loading, error } = useQuery<
		GetTransferOwnershipAvailabilityQuery,
		GetTransferOwnershipAvailabilityQueryVariables
	>(GetTransferOwnershipAvailabilityDocument, {
		variables: {
			node_ids: nodes.map((node) => node.id),
			user_id: userId as string
		},
		fetchPolicy: 'network-only',
		skip: !userId || nodes.length === 0
	});
	useErrorHandler(error, 'GET_TRANSFER_OWNERSHIP_AVAILABILITY');

	return { data, loading, error };
}
