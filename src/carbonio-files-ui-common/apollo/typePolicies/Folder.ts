/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldFunctionOptions, TypePolicy } from '@apollo/client';
import { forEach } from 'lodash';

import { mergeNodesList, readNodesList } from './utils';
import { NodesPage, NodesPageCachedObject } from '../../types/apollo';
import { Folder, FolderChildrenArgs, ParentIdFragmentDoc } from '../../types/graphql/types';

export const folderTypePolicies: TypePolicy = {
	fields: {
		children: {
			keyArgs: ['sort'],
			merge(
				existing: NodesPageCachedObject,
				incoming: NodesPage,
				fieldFunctions: FieldFunctionOptions<Partial<FolderChildrenArgs>, Record<string, unknown>>
			): NodesPageCachedObject {
				const merged = mergeNodesList(
					// for filters, if first page is requested, clear cached data emptying existing data
					fieldFunctions.args?.page_token ? existing.nodes : { ordered: [], unOrdered: [] },
					incoming.nodes,
					fieldFunctions
				);

				return {
					page_token: incoming.page_token,
					nodes: merged
				};
			},
			// Return all items stored so far, to avoid ambiguities
			// about the order of the items.
			read(
				existing: NodesPageCachedObject | undefined,
				fieldFunctions: FieldFunctionOptions<Partial<FolderChildrenArgs>, Record<string, unknown>>
			): NodesPage | undefined {
				if (existing) {
					const existingNodes = existing.nodes ? readNodesList(existing.nodes) : [];
					// update children to set parent field
					const { toReference, cache, readField } = fieldFunctions;

					const folderId = readField<Folder['id']>('id' satisfies keyof Folder);
					const typename = readField<Folder['__typename']>('__typename' satisfies keyof Folder);
					if (folderId) {
						const parentFolderRef = toReference({
							__typename: typename,
							id: folderId
						});
						if (parentFolderRef) {
							// write parent data on each child
							forEach(existingNodes, (child) => {
								const parentCachedData = cache.readFragment({
									id: cache.identify(child),
									fragment: ParentIdFragmentDoc,
									fragmentName: 'ParentId'
								});
								if (!parentCachedData?.parent) {
									// use writeFragment and not cache modify in order to write the field even if it is not already present
									cache.writeFragment({
										id: cache.identify(child),
										fragment: ParentIdFragmentDoc,
										fragmentName: 'ParentId',
										// do not broadcast update to avoid refetch of queries
										broadcast: false,
										data: {
											parent: {
												__typename: typename,
												id: folderId
											}
										}
									});
								}
							});
						}
					}
					return {
						nodes: existingNodes,
						page_token: existing.page_token
					};
				}
				return existing;
			}
		}
	}
};
