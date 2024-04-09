/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useMutation } from '@apollo/client';
import { useSnackbar } from '@zextras/carbonio-design-system';
import { filter, some } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useActiveNode } from '../../../../hooks/useActiveNode';
import useUserInfo from '../../../../hooks/useUserInfo';
import { assertCachedObject, recursiveShareEvict } from '../../../apollo/cacheUtils';
import FIND_NODES from '../../../graphql/queries/findNodes.graphql';
import GET_CHILDREN from '../../../graphql/queries/getChildren.graphql';
import { NodeCachedObject } from '../../../types/apollo';
import { Node, PickIdNodeType } from '../../../types/common';
import {
	DeleteShareDocument,
	DeleteShareMutation,
	DeleteShareMutationVariables,
	DistributionList,
	FindNodesQuery,
	Folder,
	GetChildrenQuery,
	ParentIdFragment,
	ParentIdFragmentDoc,
	SharedTarget,
	ShareTargetFragmentDoc,
	User
} from '../../../types/graphql/types';
import { isFolder, isSearchView } from '../../../utils/utils';
import { useErrorHandler } from '../../useErrorHandler';
import { useUpdateFilterContent } from '../useUpdateFilterContent';
import { useUpdateFolderContent } from '../useUpdateFolderContent';
import { isQueryResult } from '../utils';

/**
 * Mutation to delete share.
 * Can return error: ErrorCode.SHARE_NOT_FOUND
 */
export function useDeleteShareMutation(): (
	node: PickIdNodeType,
	shareTargetId: string
) => Promise<FetchResult<DeleteShareMutation>> {
	const createSnackbar = useSnackbar();
	const { removeNodesFromFolder } = useUpdateFolderContent();
	const { removeNodesFromFilter } = useUpdateFilterContent();
	const [t] = useTranslation();
	const { me } = useUserInfo();
	const location = useLocation();
	const { activeNodeId, removeActiveNode } = useActiveNode();

	const [deleteShareMutation, { error }] = useMutation<
		DeleteShareMutation,
		DeleteShareMutationVariables
	>(DeleteShareDocument);

	useErrorHandler(error, 'DELETE_SHARE', { type: 'error' });

	const deleteShare: (
		node: PickIdNodeType,
		shareTargetId: string
	) => Promise<FetchResult<DeleteShareMutation>> = useCallback(
		(node: PickIdNodeType, shareTargetId: string) =>
			deleteShareMutation({
				variables: {
					node_id: node.id,
					share_target_id: shareTargetId
				},
				optimisticResponse: {
					__typename: 'Mutation',
					deleteShare: true
				},
				errorPolicy: 'all',
				update(cache, { data }) {
					if (data?.deleteShare) {
						cache.modify<NodeCachedObject>({
							id: cache.identify(node),
							fields: {
								shares(existingShares) {
									assertCachedObject(existingShares);
									const updatedShares = filter(existingShares.shares, (existingShareRef) => {
										const sharedTarget: User | DistributionList | null | undefined =
											existingShareRef.share_target &&
											cache.readFragment<SharedTarget>({
												id: cache.identify(existingShareRef.share_target),
												fragment: ShareTargetFragmentDoc
											});
										return !(sharedTarget && sharedTarget.id === shareTargetId);
									});
									if (updatedShares.length === 0 && !isSearchView(location)) {
										// remove node from shared by me when user remove all collaborators
										removeNodesFromFilter(
											[node.id],
											(existingNodesRefs) => existingNodesRefs.args?.shared_by_me === true
										);
									}
									return { ...existingShares, shares: updatedShares };
								}
							}
						});
						recursiveShareEvict(cache, node);
						// always remove node when user remove self share
						if (shareTargetId === me) {
							removeNodesFromFilter([node.id], () => true);

							const parentFolder = cache.readFragment<ParentIdFragment>({
								id: cache.identify(node),
								fragment: ParentIdFragmentDoc
							});
							if (parentFolder?.parent) {
								removeNodesFromFolder(parentFolder.parent as Pick<Folder, '__typename' | 'id'>, [
									node.id
								]);
							}
						}
					}
				},
				onQueryUpdated(observableQuery, { result }) {
					if (activeNodeId === node.id) {
						const { query } = observableQuery.options;
						let listNodes = null;
						if (isQueryResult<FindNodesQuery>(query, result, FIND_NODES)) {
							listNodes = result.findNodes?.nodes;
						} else if (
							isQueryResult<GetChildrenQuery>(query, result, GET_CHILDREN) &&
							result.getNode &&
							isFolder(result.getNode)
						) {
							listNodes = result.getNode.children?.nodes;
						}
						// close displayer when deleted share cause node to be removed from the list
						if (
							listNodes !== null &&
							(shareTargetId === me ||
								!some<Pick<Node, 'id'> | null>(listNodes, (listNode) => node.id === listNode?.id))
						) {
							removeActiveNode();
						}
					}
				}
			}).then((result) => {
				if (result.data?.deleteShare) {
					createSnackbar({
						key: new Date().toLocaleString(),
						type: 'success',
						label: t('snackbar.deleteShare.success', 'Success'),
						replace: true,
						hideButton: true
					});
				}
				return result;
			}),
		[
			activeNodeId,
			createSnackbar,
			deleteShareMutation,
			location,
			me,
			removeActiveNode,
			removeNodesFromFilter,
			removeNodesFromFolder,
			t
		]
	);

	return deleteShare;
}
