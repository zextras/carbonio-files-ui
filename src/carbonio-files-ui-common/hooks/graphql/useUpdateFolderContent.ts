/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { ApolloClient, useApolloClient } from '@apollo/client';

import { addNodeInCachedChildren, removeNodesFromFolder } from '../../apollo/cacheUtils';
import { nodeSortVar } from '../../apollo/nodeSortVar';
import GET_CHILDREN from '../../graphql/queries/getChildren.graphql';
import {
	ChildFragment,
	Folder,
	GetChildrenQuery,
	GetChildrenQueryVariables,
	Maybe,
	Node
} from '../../types/graphql/types';
import { addNodeInSortedList, isFolder } from '../../utils/utils';

export type UpdateFolderContentType = {
	addNodeToFolder: (
		folder: Pick<Folder, 'id'>,
		newNode: ChildFragment
	) => { newPosition: number; isLast: boolean };
	removeNodesFromFolder: (folder: Pick<Folder, 'id'>, nodeIdsToRemove: string[]) => void;
};

export const useUpdateFolderContent = (
	apolloClientArg?: ApolloClient<object>
): UpdateFolderContentType => {
	// TODO remove apolloClientArg when useApolloClient is safe(provider moved up)
	// eslint-disable-next-line react-hooks/rules-of-hooks
	const apolloClient = apolloClientArg || useApolloClient();

	const addNodeToFolder = useCallback<UpdateFolderContentType['addNodeToFolder']>(
		(folder, newNode) => {
			const cachedFolder = apolloClient.cache.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>({
				query: GET_CHILDREN,
				variables: {
					node_id: folder.id,
					children_limit: Number.MAX_SAFE_INTEGER,
					sort: nodeSortVar()
				}
			});

			if (cachedFolder === null) {
				return { newPosition: 0, isLast: true };
			}

			let nodes: Array<Maybe<Node>> = [];

			if (cachedFolder && cachedFolder.getNode && isFolder(cachedFolder.getNode)) {
				nodes = cachedFolder.getNode.children.nodes;
			}

			// if folder is empty, just write cache
			if (nodes.length === 0) {
				addNodeInCachedChildren(apolloClient.cache, newNode, folder.id, 0);
				return { newPosition: 0, isLast: true };
			}
			// else find the position of the node in the loaded list to check
			// if the updated node is an ordered or an unordered node
			const newIndex = addNodeInSortedList(nodes, newNode, nodeSortVar());
			addNodeInCachedChildren(apolloClient.cache, newNode, folder.id, newIndex);
			return {
				newPosition: newIndex > -1 ? newIndex : nodes.length,
				isLast: newIndex === -1 || newIndex === nodes.length
			};
		},
		[apolloClient]
	);

	const removeNodesFromFolderCallback = useCallback<
		UpdateFolderContentType['removeNodesFromFolder']
	>(
		(folder, nodeIdsToRemove) => {
			removeNodesFromFolder(apolloClient.cache, folder.id, nodeIdsToRemove);
		},
		[apolloClient]
	);

	return { addNodeToFolder, removeNodesFromFolder: removeNodesFromFolderCallback };
};
