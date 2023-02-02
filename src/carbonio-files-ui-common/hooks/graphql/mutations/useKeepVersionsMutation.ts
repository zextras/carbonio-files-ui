/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';
import { map, includes } from 'lodash';

import KEEP_VERSIONS from '../../../graphql/mutations/keepVersions.graphql';
import GET_VERSIONS from '../../../graphql/queries/getVersions.graphql';
import {
	GetVersionsQuery,
	GetVersionsQueryVariables,
	KeepVersionsMutation,
	KeepVersionsMutationVariables
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export type KeepVersionsType = (
	nodeId: string,
	versions: Array<number>,
	keepForever: boolean
) => Promise<FetchResult<KeepVersionsMutation>>;

/**
 * Can return error:
 * VERSIONS_LIMIT_REACHED: too many versions are marked to be kept forever
 * FILE_VERSION_NOT_FOUND: version not found
 */
export function useKeepVersionsMutation(): KeepVersionsType {
	const [keepVersionsMutation, { error: keepVersionsError }] = useMutation<
		KeepVersionsMutation,
		KeepVersionsMutationVariables
	>(KEEP_VERSIONS);

	const keepVersions: KeepVersionsType = useCallback(
		(nodeId: string, versions: Array<number>, keepForever: boolean) =>
			keepVersionsMutation({
				variables: {
					node_id: nodeId,
					versions,
					keep_forever: keepForever
				},
				optimisticResponse: {
					__typename: 'Mutation',
					keepVersions: versions
				},
				update(cache, { data }) {
					if (data?.keepVersions) {
						cache.updateQuery<GetVersionsQuery, GetVersionsQueryVariables>(
							{ query: GET_VERSIONS, variables: { node_id: nodeId }, overwrite: true },
							(existingVersions) => ({
								getVersions: map(existingVersions?.getVersions, (fileVersion) =>
									fileVersion && includes(data.keepVersions, fileVersion.version)
										? { ...fileVersion, keep_forever: keepForever }
										: fileVersion
								)
							})
						);
					}
				}
			}),
		[keepVersionsMutation]
	);
	useErrorHandler(keepVersionsError, 'KEEP_VERSIONS');

	return keepVersions;
}
