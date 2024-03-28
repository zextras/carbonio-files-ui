/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { ApolloError, FetchResult, useMutation } from '@apollo/client';

import { assertCachedObject, recursiveShareEvict } from '../../../apollo/cacheUtils';
import CREATE_SHARE from '../../../graphql/mutations/createShare.graphql';
import { NodeCachedObject, ShareCachedObject } from '../../../types/apollo';
import { Node } from '../../../types/common';
import {
	CreateShareMutation,
	CreateShareMutationVariables,
	SharePermission
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export type CreateShareType = (
	node: Pick<Node, 'id' | '__typename'>,
	shareTargetId: string,
	permission: SharePermission,
	customMessage?: string
) => Promise<FetchResult<CreateShareMutation>>;

/**
 * Can return error: ErrorCode.SHARE_CREATION_ERROR
 */
export function useCreateShareMutation(): [
	createShare: CreateShareType,
	createShareError: ApolloError | undefined
] {
	const [createShareMutation, { error: createShareError }] = useMutation<
		CreateShareMutation,
		CreateShareMutationVariables
	>(CREATE_SHARE);

	const createShare = useCallback<CreateShareType>(
		(node, shareTargetId, permission, customMessage) =>
			createShareMutation({
				variables: {
					node_id: node.id,
					share_target_id: shareTargetId,
					permission,
					custom_message: customMessage
				},
				update(cache, { data }) {
					if (data?.createShare) {
						cache.modify<NodeCachedObject>({
							id: cache.identify(node),
							fields: {
								shares(existingShareRefs, { toReference }) {
									assertCachedObject(existingShareRefs);
									const nodeRef = toReference(data.createShare.node);
									const targetRef =
										data.createShare.share_target && toReference(data.createShare.share_target);

									const newShare: ShareCachedObject = {
										...data.createShare,
										share_target: targetRef,
										node: nodeRef
									};

									return {
										...existingShareRefs,
										shares: [...existingShareRefs.shares, newShare]
									};
								}
							}
						});
						recursiveShareEvict(cache, node);
					}
				}
			}),
		[createShareMutation]
	);
	useErrorHandler(createShareError, 'CREATE_SHARE');

	return [createShare, createShareError];
}
