/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';
import { filter, includes } from 'lodash';

import {
	DeleteLinksDocument,
	DeleteLinksMutation,
	DeleteLinksMutationVariables,
	GetLinksDocument
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export type DeleteLinksType = (linkIds: Array<string>) => Promise<FetchResult<DeleteLinksMutation>>;

/**
 * Can return error: ErrorCode.LINK_NOT_FOUND
 */
export function useDeleteLinksMutation(nodeId: string): DeleteLinksType {
	const [deleteLinksMutation, { error: deleteLinksError }] = useMutation<
		DeleteLinksMutation,
		DeleteLinksMutationVariables
	>(DeleteLinksDocument);

	const deleteLinks: DeleteLinksType = useCallback(
		(linkIds: Array<string>) =>
			deleteLinksMutation({
				variables: {
					link_ids: linkIds
				},
				update(cache, { data }) {
					if (data?.deleteLinks) {
						cache.updateQuery(
							{
								query: GetLinksDocument,
								variables: {
									node_id: nodeId
								}
							},
							(queryData) => ({
								getLinks: filter(
									queryData?.getLinks,
									(existingLink) => !!existingLink && !includes(data.deleteLinks, existingLink.id)
								)
							})
						);
					}
				}
			}),
		[deleteLinksMutation, nodeId]
	);
	useErrorHandler(deleteLinksError, 'DELETE_LINKS');

	return deleteLinks;
}
