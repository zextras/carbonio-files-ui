/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable arrow-body-style */
import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';

import { QUOTA_CHANGED_EVENT } from '../../../../constants';
import {
	CloneVersionDocument,
	CloneVersionMutation,
	GetVersionsDocument
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
 * OVER_QUOTA_REACHED: over quota
 */
export function useCloneVersionMutation(): CloneVersionType {
	const [cloneVersionMutation, { error: cloneVersionError }] = useMutation(CloneVersionDocument, {
		errorPolicy: 'all',
		onCompleted({ cloneVersion: cloneVersionResult }) {
			if (cloneVersionResult) {
				window.dispatchEvent(new CustomEvent(QUOTA_CHANGED_EVENT));
			}
		}
	});

	const cloneVersion: CloneVersionType = useCallback(
		(nodeId: string, version: number) => {
			return cloneVersionMutation({
				variables: {
					node_id: nodeId,
					version
				},
				update(cache, { data }) {
					if (data?.cloneVersion) {
						cache.updateQuery(
							{ query: GetVersionsDocument, variables: { node_id: nodeId }, overwrite: true },
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
	useErrorHandler(cloneVersionError, 'CLONE_VERSION');

	return cloneVersion;
}
