/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable arrow-body-style */
import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';
import { filter } from 'lodash';

import DELETE_COLLABORATION_LINKS from '../../../graphql/mutations/deleteCollaborationLinks.graphql';
import { PickIdTypenameNodeType } from '../../../types/common';
import {
	DeleteCollaborationLinksMutation,
	DeleteCollaborationLinksMutationVariables,
	GetCollaborationLinksDocument
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
						cache.updateQuery(
							{
								query: GetCollaborationLinksDocument,
								variables: {
									node_id: node.id
								}
							},
							(queryData) => ({
								getCollaborationLinks: filter(
									queryData?.getCollaborationLinks,
									(existingCollaborationLink) =>
										existingCollaborationLink?.id !== undefined &&
										!data.deleteCollaborationLinks.includes(existingCollaborationLink.id)
								)
							})
						);
					}
				}
			});
		},
		[deleteCollaborationLinksMutation, node]
	);
	useErrorHandler(deleteCollaborationLinksError, 'DELETE_COLLABORATION_LINKS');

	return deleteCollaborationLinks;
}
