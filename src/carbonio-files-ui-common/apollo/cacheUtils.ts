/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { ApolloCache, NormalizedCacheObject } from '@apollo/client';
import { filter, findIndex, size } from 'lodash';

import CHILD from '../graphql/fragments/child.graphql';
import GET_CHILDREN from '../graphql/queries/getChildren.graphql';
import { NodesPageCachedObject } from '../types/apollo';
import { ChildFragment, GetChildrenQuery, GetChildrenQueryVariables } from '../types/graphql/types';
import { addNodeInSortedList, isFolder } from '../utils/utils';
import { nodeSortVar } from './nodeSortVar';

export const removeNodesFromFolder = (
	cache: ApolloCache<object>,
	folderId: string,
	nodeIdsToRemove: string[]
): void => {
	cache.modify({
		id: cache.identify({ __typename: 'Folder', id: folderId }),
		fields: {
			children(
				existingNodesRefs: NodesPageCachedObject,
				{ readField, DELETE }
			): NodesPageCachedObject {
				const newOrdered = filter(existingNodesRefs.nodes?.ordered, (ref) => {
					const id = readField<string>('id', ref);
					return !!id && !nodeIdsToRemove.includes(id);
				});

				const newUnOrdered = filter(existingNodesRefs.nodes?.unOrdered, (ref) => {
					const id = readField<string>('id', ref);
					return !!id && !nodeIdsToRemove.includes(id);
				});

				if (existingNodesRefs.page_token && size(newOrdered) === 0 && size(newUnOrdered) === 0) {
					return DELETE;
				}

				return {
					...existingNodesRefs,
					nodes: {
						ordered: newOrdered,
						unOrdered: newUnOrdered
					}
				};
			}
		}
	});
};

/**
 * Add a node in cached children, positioning it at the given index.
 * <li>If index is greater or equal to ordered list length but there are also unordered items,
 * the node is added in the unordered list</li>
 * <li>If index is invalid, the node is added to the unordered list and will be moved in the ordered
 * once the page that contains it is loaded</li>
 */
export const addNodeInCachedChildren = (
	cache: ApolloCache<unknown>,
	newNode: ChildFragment,
	folderId: string,
	index: number,
	addIfUnordered = true
): boolean =>
	// using the cache modify function allows to override the cache data skipping the merge function
	cache.modify({
		id: cache.identify({ __typename: 'Folder', id: folderId }),
		fields: {
			// existingChildrenRefs is the data of the cache (array of references)
			children(
				existingChildrenRefs: NodesPageCachedObject,
				{ readField, storeFieldName, DELETE }
			): NodesPageCachedObject {
				const sortArg = JSON.parse(storeFieldName.replace(`children:`, '')).sort;

				if (nodeSortVar() !== sortArg) {
					return DELETE;
				}

				const newNodeRef = cache.writeFragment<ChildFragment>({
					fragment: CHILD,
					fragmentName: 'Child',
					data: newNode
				});

				const newOrdered =
					(existingChildrenRefs.nodes && [...existingChildrenRefs.nodes.ordered]) || [];
				const newUnOrdered =
					(existingChildrenRefs.nodes && [...existingChildrenRefs.nodes.unOrdered]) || [];

				let newIndex = index;

				const currentIndexOrdered = findIndex(
					newOrdered,
					(item) => readField('id', item) === readField('id', newNodeRef)
				);
				let currentIndexUnordered = -1;
				if (currentIndexOrdered < 0) {
					currentIndexUnordered = findIndex(
						newUnOrdered,
						(item) => readField('id', item) === readField('id', newNodeRef)
					);
				}

				// if the node was already loaded, remove it from the list before the insert of the new one
				if (currentIndexOrdered > -1) {
					newOrdered.splice(currentIndexOrdered, 1);
					// also, if current position is before the new one, decrease by 1 the new index
					if (currentIndexOrdered < newIndex) {
						newIndex -= 1;
					}
				} else if (currentIndexUnordered > -1) {
					newUnOrdered.splice(currentIndexUnordered, 1);
					// also, if current position is before the new one, decrease by 1 the new index
					if (currentIndexUnordered + newOrdered.length < newIndex) {
						newIndex -= 1;
					}
				}

				const alreadyLoaded = currentIndexOrdered > -1 || currentIndexUnordered > -1;

				if (newNodeRef) {
					if (newIndex < 0 || newIndex > newOrdered.length + newUnOrdered.length) {
						if (alreadyLoaded || addIfUnordered) {
							// no valid position, put node as last unordered
							newUnOrdered.push(newNodeRef);
						}
					} else if (newIndex < newOrdered.length) {
						// if newIndex is valid, and it's before last element of the ordered list, put the node in the ordered list
						newOrdered.splice(newIndex, 0, newNodeRef);
					} else if (alreadyLoaded || addIfUnordered) {
						// otherwise, add the node in the unordered list
						// calculate the index in the unordered by subtracting the ordered length to the given index
						newIndex -= newOrdered.length;
						newUnOrdered.splice(newIndex, 0, newNodeRef);
					}
				}

				return {
					...existingChildrenRefs,
					nodes: {
						ordered: newOrdered,
						unOrdered: newUnOrdered
					}
				};
			}
		}
	});

export const upsertNodeInFolder = (
	cache: ApolloCache<NormalizedCacheObject>,
	folderId: string,
	newNode: ChildFragment
): void => {
	const cachedFolder = cache.readQuery<GetChildrenQuery, GetChildrenQueryVariables>({
		query: GET_CHILDREN,
		variables: {
			node_id: folderId,
			children_limit: Number.MAX_SAFE_INTEGER,
			sort: nodeSortVar()
		}
	});

	if (cachedFolder && cachedFolder.getNode && isFolder(cachedFolder.getNode)) {
		const { nodes } = cachedFolder.getNode.children;
		addNodeInCachedChildren(
			cache,
			newNode,
			folderId,
			nodes.length === 0 ? 0 : addNodeInSortedList(nodes, newNode, nodeSortVar()),
			false
		);
	}
};
