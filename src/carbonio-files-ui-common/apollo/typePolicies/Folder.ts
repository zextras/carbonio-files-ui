/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldFunctionOptions, TypePolicy } from '@apollo/client';
import { forEach } from 'lodash';

import { mergeNodesList, readNodesList } from './utils';
import { FindNodesCachedObject, NodesPage, NodesPageCachedObject } from '../../types/apollo';
import {
	FolderChildrenArgs,
	GetChildrenQueryVariables,
	NodeParentFragment,
	NodeParentFragmentDoc,
	ParentFragment,
	ParentFragmentDoc
} from '../../types/graphql/types';
import { findNodeTypeName } from '../cacheUtils';

export const folderTypePolicies: TypePolicy = {
	fields: {
		children: {
			keyArgs: ['sort'],
			merge(
				existing: NodesPageCachedObject,
				incoming: NodesPage,
				fieldFunctions: FieldFunctionOptions<
					Partial<FolderChildrenArgs>,
					Partial<GetChildrenQueryVariables>
				>
			): NodesPageCachedObject {
				const merged = mergeNodesList(
					// for filters, if first page is requested, clear cached data emptying existing data
					fieldFunctions.variables?.page_token ? existing.nodes : { ordered: [], unOrdered: [] },
					incoming.nodes,
					fieldFunctions
				);
				// update children to set parent field
				const { variables, toReference, canRead, cache } = fieldFunctions;

				if (variables?.node_id) {
					const typename = findNodeTypeName(variables.node_id, { canRead, toReference });
					const parentFolderRef = toReference({
						__typename: typename,
						id: variables.node_id
					});
					if (parentFolderRef) {
						const parentNode = cache.readFragment<ParentFragment>({
							fragment: ParentFragmentDoc,
							fragmentName: 'Parent',
							id: cache.identify(parentFolderRef)
						});
						// write parent data on each child
						forEach([...merged.ordered, ...merged.unOrdered], (child) => {
							cache.writeFragment<NodeParentFragment>({
								id: cache.identify(child),
								fragment: NodeParentFragmentDoc,
								fragmentName: 'NodeParent',
								data: {
									parent: parentNode
								}
							});
						});
					}
				}
				return {
					page_token: incoming.page_token,
					nodes: merged
				};
			},
			// Return all items stored so far, to avoid ambiguities
			// about the order of the items.
			read(existing: FindNodesCachedObject | undefined): NodesPage | undefined {
				if (existing) {
					return {
						nodes: existing?.nodes ? readNodesList(existing.nodes) : [],
						page_token: existing.page_token
					};
				}
				return existing;
			}
		}
	}
};
