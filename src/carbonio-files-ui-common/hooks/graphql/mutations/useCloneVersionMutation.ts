/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable arrow-body-style */
import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';

import CLONE_VERSION from '../../../graphql/mutations/cloneVersion.graphql';
import GET_VERSIONS from '../../../graphql/queries/getVersions.graphql';
import {
	CloneVersionMutation,
	CloneVersionMutationVariables,
	GetVersionsQuery,
	GetVersionsQueryVariables
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export type CloneVersionType = (
	nodeId: string,
	version: number
) => Promise<FetchResult<CloneVersionMutation>>;

/**
 * Can return error:
 * VERSIONS_LIMIT_REACHED: limit of creatable versions reached
 * FILE_VERSION_NOT_FOUND: version not found
 */
export function useCloneVersionMutation(): CloneVersionType {
	const [cloneVersionMutation, { error: cloneVersionError }] = useMutation<
		CloneVersionMutation,
		CloneVersionMutationVariables
	>(CLONE_VERSION);

	const cloneVersion: CloneVersionType = useCallback(
		(nodeId: string, version: number) => {
			return cloneVersionMutation({
				variables: {
					node_id: nodeId,
					version
				},
				update(cache, { data }) {
					if (data?.cloneVersion) {
						cache.updateQuery<GetVersionsQuery, GetVersionsQueryVariables>(
							{ query: GET_VERSIONS, variables: { node_id: nodeId }, overwrite: true },
							(existingVersions) => ({
								getVersions: [data.cloneVersion, ...(existingVersions?.getVersions || [])]
							})
						);
					}
				}
			});
		},
		[cloneVersionMutation]
	);
	useErrorHandler(cloneVersionError, 'KEEP_VERSIONS');

	return cloneVersion;
}
