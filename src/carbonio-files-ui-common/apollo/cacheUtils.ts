/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { ApolloCache, FieldFunctionOptions, isReference, Reference } from '@apollo/client';
import { filter, find, findIndex, forEach, size } from 'lodash';

import { nodeSortVar } from './nodeSortVar';
import { FolderCachedObject } from '../types/apollo';
import { Node } from '../types/common';
import introspection from '../types/graphql/possible-types';
import { ChildFragment, ChildWithParentFragmentDoc, NodeType } from '../types/graphql/types';

export function assertCachedObject<T>(value: T | Reference): asserts value is T {
	if (isReference(value)) {
		throw new Error(`value ${JSON.stringify(value)} is a reference`);
	}
}

export const removeNodesFromFolder = (
	cache: ApolloCache<object>,
	folderId: string,
	nodeIdsToRemove: string[]
): void => {
	cache.modify<FolderCachedObject>({
		id: cache.identify({ __typename: 'Folder', id: folderId }),
		fields: {
			children(existingNodesRefs, { readField, DELETE }) {
				assertCachedObject(existingNodesRefs);
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
	cache.modify<FolderCachedObject>({
		id: cache.identify({ __typename: 'Folder', id: folderId }),
		fields: {
			children(existingChildrenRefs, { readField, storeFieldName, DELETE }) {
				assertCachedObject(existingChildrenRefs);
				const sortArg = JSON.parse(storeFieldName.replace(`children:`, '')).sort;

				if (nodeSortVar() !== sortArg) {
					return DELETE;
				}

				const newNodeRef = cache.writeFragment({
					fragment: ChildWithParentFragmentDoc,
					fragmentName: 'ChildWithParent',
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

export const recursiveShareEvict = (cache: ApolloCache<unknown>, node: Node<'id'>): boolean =>
	cache.modify<FolderCachedObject>({
		id: cache.identify(node),
		fields: {
			children(existingChildrenRefs, { readField, DELETE }) {
				assertCachedObject(existingChildrenRefs);
				if (existingChildrenRefs.nodes) {
					forEach(
						[...existingChildrenRefs.nodes.ordered, ...existingChildrenRefs.nodes.unOrdered],
						(ref) => {
							cache.evict({ id: ref.__ref, fieldName: 'shares' });
							if (readField<NodeType>('type', ref) === NodeType.Folder) {
								const id = readField<string>('id', ref);
								const __typename = readField<Node['__typename']>('__typename', ref);
								if (id && __typename) {
									recursiveShareEvict(cache, { id, __typename });
								}
							}
						}
					);
					cache.gc();
				}
				return DELETE;
			}
		}
	});

export function findNodeTypeName(
	nodeId: string,
	{ canRead, toReference }: Pick<FieldFunctionOptions, 'toReference' | 'canRead'>
): string | undefined {
	return find(introspection.possibleTypes.Node, (nodePossibleType) => {
		const nodeRef = toReference({
			__typename: nodePossibleType,
			id: nodeId
		});
		return canRead(nodeRef);
	});
}
