/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable arrow-body-style */
import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';
import { filter, includes } from 'lodash';

import LINK from '../../../graphql/fragments/link.graphql';
import DELETE_LINKS from '../../../graphql/mutations/deleteLinks.graphql';
import {
	DeleteLinksMutation,
	DeleteLinksMutationVariables,
	LinkFragment
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export type DeleteLinksType = (linkIds: Array<string>) => Promise<FetchResult<DeleteLinksMutation>>;

/**
 * Can return error: ErrorCode.LINK_NOT_FOUND
 */
export function useDeleteLinksMutation(nodeId: string, nodeTypename: string): DeleteLinksType {
	const [deleteLinksMutation, { error: deleteLinksError }] = useMutation<
		DeleteLinksMutation,
		DeleteLinksMutationVariables
	>(DELETE_LINKS);

	const deleteLinks: DeleteLinksType = useCallback(
		(linkIds: Array<string>) => {
			return deleteLinksMutation({
				variables: {
					link_ids: linkIds
				},
				update(cache, { data }) {
					if (data?.deleteLinks) {
						cache.modify({
							id: cache.identify({ id: nodeId, __typename: nodeTypename }),
							fields: {
								links(existingLinks) {
									const updatedLinks = filter(existingLinks, (existingLink) => {
										const link = cache.readFragment<LinkFragment>({
											id: cache.identify(existingLink),
											fragment: LINK
										});
										return !(link && includes(data.deleteLinks, link.id));
									});
									return updatedLinks;
								}
							}
						});
					}
				}
			});
		},
		[deleteLinksMutation, nodeId, nodeTypename]
	);
	useErrorHandler(deleteLinksError, 'DELETE_LINKS');

	return deleteLinks;
}
