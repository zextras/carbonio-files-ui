/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldFunctionOptions, TypePolicy } from '@apollo/client';

import { FindNodesCachedObject, NodesPage, NodesPageCachedObject } from '../../types/apollo';
import { FolderChildrenArgs, GetChildrenQueryVariables } from '../../types/graphql/types';
import { mergeNodesList, readNodesList } from './utils';

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
				return {
					page_token: incoming.page_token,
					nodes: mergeNodesList(
						// for filters, if first page is requested, clear cached data emptying existing data
						fieldFunctions.variables?.page_token ? existing.nodes : { ordered: [], unOrdered: [] },
						incoming.nodes,
						fieldFunctions
					)
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
