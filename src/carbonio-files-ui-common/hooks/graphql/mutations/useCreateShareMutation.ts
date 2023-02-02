/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { ApolloError, FetchResult, gql, useMutation } from '@apollo/client';

import SHARE_TARGET from '../../../graphql/fragments/shareTarget.graphql';
import CREATE_SHARE from '../../../graphql/mutations/createShare.graphql';
import { ShareCachedObject, SharesCachedObject } from '../../../types/apollo';
import { Node } from '../../../types/common';
import {
	CreateShareMutation,
	CreateShareMutationVariables,
	SharePermission,
	ShareTargetFragment
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export type CreateShareType = (
	node: Pick<Node, 'id'>,
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
						cache.modify({
							id: cache.identify(node),
							fields: {
								shares(existingShareRefs: SharesCachedObject): SharesCachedObject {
									// TODO: move fragment to graphql file and add type
									const nodeRef = cache.writeFragment({
										data: data.createShare.node,
										fragment: gql`
											fragment NewNode on Node {
												id
											}
										`
									});
									let targetRef;
									if (data.createShare.share_target) {
										targetRef = cache.writeFragment<ShareTargetFragment>({
											data: data.createShare.share_target,
											fragment: SHARE_TARGET
										});
									}

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
					}
				}
			}),
		[createShareMutation]
	);
	useErrorHandler(createShareError, 'CREATE_SHARE');

	return [createShare, createShareError];
}
