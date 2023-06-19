/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';

import CREATE_COLLABORATION_LINK from '../../../graphql/mutations/createCollaborationLink.graphql';
import { Node } from '../../../types/common';
import {
	CreateCollaborationLinkMutation,
	CreateCollaborationLinkMutationVariables,
	SharePermission,
	GetCollaborationLinksDocument
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export type CreateCollaborationLinkType = (
	permission: SharePermission
) => Promise<FetchResult<CreateCollaborationLinkMutation>>;

export function useCreateCollaborationLinkMutation(node: Pick<Node, '__typename' | 'id'>): {
	createCollaborationLink: CreateCollaborationLinkType;
	loading: boolean;
} {
	const [createCollaborationLinkMutation, { error: createCollaborationLinkError, loading }] =
		useMutation<CreateCollaborationLinkMutation, CreateCollaborationLinkMutationVariables>(
			CREATE_COLLABORATION_LINK
		);

	const createCollaborationLink: CreateCollaborationLinkType = useCallback(
		(permission) =>
			createCollaborationLinkMutation({
				variables: {
					node_id: node.id,
					permission
				},
				update(cache, { data }) {
					if (data?.createCollaborationLink) {
						cache.updateQuery(
							{
								query: GetCollaborationLinksDocument,
								variables: {
									node_id: node.id
								}
							},
							(queryData) => ({
								getCollaborationLinks: [
									data.createCollaborationLink,
									...(queryData?.getCollaborationLinks || [])
								]
							})
						);
					}
				}
			}),
		[createCollaborationLinkMutation, node]
	);
	useErrorHandler(createCollaborationLinkError, 'CREATE_COLLABORATION_LINK');
	return { createCollaborationLink, loading };
}
