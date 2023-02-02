/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable arrow-body-style */
import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';
import { filter, includes } from 'lodash';

import COLLABORATION_LINK from '../../../graphql/fragments/collaborationLink.graphql';
import DELETE_COLLABORATION_LINKS from '../../../graphql/mutations/deleteCollaborationLinks.graphql';
import { PickIdTypenameNodeType } from '../../../types/common';
import {
	CollaborationLinkFragment,
	DeleteCollaborationLinksMutation,
	DeleteCollaborationLinksMutationVariables
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export type DeleteCollaborationLinksType = (
	collaborationLinkIds: Array<string>
) => Promise<FetchResult<DeleteCollaborationLinksMutation>>;

/**
 * Can return error: ErrorCode.
 */
export function useDeleteCollaborationLinksMutation(
	node: PickIdTypenameNodeType
): DeleteCollaborationLinksType {
	const [deleteCollaborationLinksMutation, { error: deleteCollaborationLinksError }] = useMutation<
		DeleteCollaborationLinksMutation,
		DeleteCollaborationLinksMutationVariables
	>(DELETE_COLLABORATION_LINKS);

	const deleteCollaborationLinks: DeleteCollaborationLinksType = useCallback(
		(collaborationLinkIds) => {
			return deleteCollaborationLinksMutation({
				variables: {
					collaboration_link_ids: collaborationLinkIds
				},
				update(cache, { data }) {
					if (data?.deleteCollaborationLinks) {
						cache.modify({
							id: cache.identify(node),
							fields: {
								collaboration_links(existingCollaborationLinks) {
									return filter(existingCollaborationLinks, (existingCollaborationLink) => {
										const collaborationLink = cache.readFragment<CollaborationLinkFragment>({
											id: cache.identify(existingCollaborationLink),
											fragment: COLLABORATION_LINK
										});
										return !(
											collaborationLink &&
											includes(data.deleteCollaborationLinks, collaborationLink.id)
										);
									});
								}
							}
						});
					}
				}
			});
		},
		[deleteCollaborationLinksMutation, node]
	);
	useErrorHandler(deleteCollaborationLinksError, 'DELETE_COLLABORATION_LINKS');

	return deleteCollaborationLinks;
}
