/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { ApolloError, FetchResult, useMutation } from '@apollo/client';
import { useSnackbar } from '@zextras/carbonio-design-system';
import { reduce } from 'lodash';
import { useTranslation } from 'react-i18next';

import { assertCachedObject, recursiveShareEvict } from '../../../apollo/cacheUtils';
import SHARE_TARGET from '../../../graphql/fragments/shareTarget.graphql';
import UPDATE_SHARE from '../../../graphql/mutations/updateShare.graphql';
import { NodeCachedObject, ShareCachedObject } from '../../../types/apollo';
import { PickIdNodeType } from '../../../types/common';
import {
	SharePermission,
	ShareTargetFragment,
	UpdateSharesMutation,
	UpdateSharesMutationVariables
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export type UpdateShareType = (
	node: PickIdNodeType,
	shareTargetIds: string[],
	permission: SharePermission
) => Promise<FetchResult<UpdateSharesMutation>>;

/**
 * Mutation to update shares.
 * Accepts an array of share target IDs to update in a single request.
 * Can return error: ErrorCode.SHARE_NOT_FOUND
 */
export function useUpdateShareMutation(): [
	updateShare: UpdateShareType,
	updateShareError: ApolloError | undefined
] {
	const createSnackbar = useSnackbar();
	const [t] = useTranslation();
	const [updateShareMutation, { error: updateShareError }] = useMutation<
		UpdateSharesMutation,
		UpdateSharesMutationVariables
	>(UPDATE_SHARE);

	const updateShare: UpdateShareType = useCallback(
		(node: PickIdNodeType, shareTargetIds: string[], permission: SharePermission) =>
			updateShareMutation({
				variables: {
					node_id: node.id,
					share_target_ids: shareTargetIds,
					permission
				},
				update(cache) {
					cache.modify<NodeCachedObject>({
						id: cache.identify(node),
						fields: {
							shares(existingShares) {
								assertCachedObject(existingShares);
								const updatedShares = reduce<ShareCachedObject, ShareCachedObject[]>(
									existingShares.shares,
									(accumulator, existingShareRef) => {
										const sharedTarget =
											existingShareRef.share_target &&
											cache.readFragment<ShareTargetFragment>({
												id: cache.identify(existingShareRef.share_target),
												fragment: SHARE_TARGET
											});
										if (sharedTarget && shareTargetIds.includes(sharedTarget.id)) {
											const newExistingShareRef: ShareCachedObject = {
												...existingShareRef,
												permission
											};
											accumulator.push(newExistingShareRef);
											return accumulator;
										}
										accumulator.push(existingShareRef);
										return accumulator;
									},
									[]
								);

								return { ...existingShares, shares: updatedShares };
							}
						}
					});
					recursiveShareEvict(cache, node);
				}
			}).then((result) => {
				if (result.data?.updateShares) {
					createSnackbar({
						key: new Date().toLocaleString(),
						severity: 'success',
						label: t('snackbar.decreaseYourOwnShare.success', 'Rights updated successfully'),
						replace: true,
						hideButton: true
					});
				}
				return result;
			}),
		[createSnackbar, t, updateShareMutation]
	);
	useErrorHandler(updateShareError, 'UPDATE_SHARE');

	return [updateShare, updateShareError];
}
