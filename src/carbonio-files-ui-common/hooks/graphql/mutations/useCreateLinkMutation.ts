/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';

import {
	CreateLinkDocument,
	CreateLinkMutation,
	CreateLinkMutationVariables,
	GetLinksDocument
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export type CreateLinkType = (
	description?: string,
	expiresAt?: number
) => Promise<FetchResult<CreateLinkMutation>>;

export function useCreateLinkMutation(nodeId: string): {
	createLink: CreateLinkType;
	loading: boolean;
} {
	const [createLinkMutation, { error: createLinkError, loading }] = useMutation<
		CreateLinkMutation,
		CreateLinkMutationVariables
	>(CreateLinkDocument);

	const createLink: CreateLinkType = useCallback(
		(description?: string, expiresAt?: number) =>
			createLinkMutation({
				variables: {
					node_id: nodeId,
					description,
					expires_at: expiresAt
				},
				update(cache, { data }) {
					if (data?.createLink) {
						cache.updateQuery(
							{
								query: GetLinksDocument,
								variables: {
									node_id: nodeId
								}
							},
							(queryData) => ({
								getLinks: [data.createLink, ...(queryData?.getLinks || [])]
							})
						);
					}
				}
			}),
		[createLinkMutation, nodeId]
	);
	useErrorHandler(createLinkError, 'CREATE_LINK');
	return { createLink, loading };
}
