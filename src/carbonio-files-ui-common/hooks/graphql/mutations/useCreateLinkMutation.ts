/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';

import LINK from '../../../graphql/fragments/link.graphql';
import CREATE_LINK from '../../../graphql/mutations/createLink.graphql';
import {
	CreateLinkMutation,
	CreateLinkMutationVariables,
	LinkFragment
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export type CreateLinkType = (
	description?: string,
	expiresAt?: number
) => Promise<FetchResult<CreateLinkMutation>>;

export function useCreateLinkMutation(
	nodeId: string,
	nodeTypename: string
): { createLink: CreateLinkType; loading: boolean } {
	const [createLinkMutation, { error: createLinkError, loading }] = useMutation<
		CreateLinkMutation,
		CreateLinkMutationVariables
	>(CREATE_LINK);

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
						cache.modify({
							id: cache.identify({ id: nodeId, __typename: nodeTypename }),
							fields: {
								links(existingLinks) {
									const newLinkRef = cache.writeFragment<LinkFragment>({
										data: data.createLink,
										fragment: LINK
									});
									return [newLinkRef, ...existingLinks];
								}
							}
						});
					}
				}
			}),
		[createLinkMutation, nodeId, nodeTypename]
	);
	useErrorHandler(createLinkError, 'CREATE_LINK');
	return { createLink, loading };
}
