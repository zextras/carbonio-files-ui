/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';
import { filter, includes } from 'lodash';

import DELETE_VERSIONS from '../../../graphql/mutations/deleteVersions.graphql';
import GET_VERSIONS from '../../../graphql/queries/getVersions.graphql';
import {
	DeleteVersionsMutation,
	DeleteVersionsMutationVariables,
	GetVersionsQuery,
	GetVersionsQueryVariables
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export type DeleteVersionsType = (
	nodeId: string,
	versions?: Array<number>
) => Promise<FetchResult<DeleteVersionsMutation>>;

/**
 * Can return error: none
 */
export function useDeleteVersionsMutation(): DeleteVersionsType {
	const [deleteVersionsMutation, { error: deleteVersionsError }] = useMutation<
		DeleteVersionsMutation,
		DeleteVersionsMutationVariables
	>(DELETE_VERSIONS);

	const deleteVersions: DeleteVersionsType = useCallback(
		(nodeId: string, versions?: Array<number>) =>
			deleteVersionsMutation({
				variables: {
					node_id: nodeId,
					versions
				},
				optimisticResponse: {
					__typename: 'Mutation',
					deleteVersions: versions || []
				},
				update(cache, { data }) {
					if (data?.deleteVersions) {
						cache.updateQuery<GetVersionsQuery, GetVersionsQueryVariables>(
							{ query: GET_VERSIONS, variables: { node_id: nodeId }, overwrite: true },
							(existingVersions) => ({
								getVersions: filter(
									existingVersions?.getVersions,
									(fileVersion) =>
										!!fileVersion && !includes(data.deleteVersions, fileVersion.version)
								)
							})
						);
					}
				}
			}),
		[deleteVersionsMutation]
	);
	useErrorHandler(deleteVersionsError, 'DELETE_VERSIONS');

	return deleteVersions;
}
