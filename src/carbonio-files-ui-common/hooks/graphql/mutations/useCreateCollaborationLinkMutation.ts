/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable arrow-body-style */
import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';

import COLLABORATION_LINK from '../../../graphql/fragments/collaborationLink.graphql';
import CREATE_COLLABORATION_LINK from '../../../graphql/mutations/createCollaborationLink.graphql';
import {
	CreateCollaborationLinkMutation,
	CreateCollaborationLinkMutationVariables,
	CollaborationLinkFragment,
	SharePermission
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
		(permission) => {
			return createCollaborationLinkMutation({
				variables: {
					node_id: nodeId,
					permission
				},
				update(cache, { data }) {
					if (data?.createCollaborationLink) {
						cache.modify({
							id: cache.identify(data.createCollaborationLink.node),
							fields: {
								collaboration_links(existingCollaborationLinks) {
									const newLinkRef = cache.writeFragment<CollaborationLinkFragment>({
										data: data.createCollaborationLink,
										fragment: COLLABORATION_LINK
									});
									return [newLinkRef, ...existingCollaborationLinks];
								}
							}
						});
					}
				}
			});
		},
		[createCollaborationLinkMutation, nodeId]
	);
	useErrorHandler(createCollaborationLinkError, 'CREATE_COLLABORATION_LINK');
	return { createCollaborationLink, loading };
}
