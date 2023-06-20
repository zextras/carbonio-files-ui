/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';

import CREATE_COLLABORATION_LINK from '../../../graphql/mutations/createCollaborationLink.graphql';
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

export function useCreateCollaborationLinkMutation(nodeId: string): {
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
					node_id: nodeId,
					permission
				},
				update(cache, { data }) {
					if (data?.createCollaborationLink) {
						cache.updateQuery(
							{
								query: GetCollaborationLinksDocument,
								variables: {
									node_id: nodeId
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
		[createCollaborationLinkMutation, nodeId]
	);
	useErrorHandler(createCollaborationLinkError, 'CREATE_COLLABORATION_LINK');
	return { createCollaborationLink, loading };
}
