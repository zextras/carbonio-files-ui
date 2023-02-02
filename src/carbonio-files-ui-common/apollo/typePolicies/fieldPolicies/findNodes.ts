/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldFunctionOptions, FieldPolicy } from '@apollo/client';

import { FindNodesCachedObject, NodesPage } from '../../../types/apollo';
import { FindNodesQueryVariables, QueryFindNodesArgs } from '../../../types/graphql/types';
import { mergeNodesList, readNodesList } from '../utils';

export const findNodesFieldPolicy: FieldPolicy<
	FindNodesCachedObject,
	NodesPage,
	NodesPage,
	FieldFunctionOptions<QueryFindNodesArgs, Partial<FindNodesQueryVariables>>
> = {
	keyArgs: [
		'flagged',
		'shared_with_me',
		'shared_by_me',
		'folder_id',
		'cascade',
		'keywords',
		'sort'
	],
	merge(existing, incoming, fieldFunctions) {
		// see https://github.com/apollographql/apollo-client/issues/6394#issuecomment-656193666
		return {
			args: fieldFunctions.args,
			page_token: incoming.page_token,
			nodes: mergeNodesList(
				// for filters, if first page is requested, clear cached data emptying existing data
				fieldFunctions.variables?.page_token && existing
					? existing.nodes
					: { ordered: [], unOrdered: [] },
				incoming.nodes,
				fieldFunctions
			)
		};
	},
	// Return all items stored so far, to avoid ambiguities
	// about the order of the items.
	read(existing) {
		if (existing) {
			return {
				nodes: existing?.nodes ? readNodesList(existing.nodes) : [],
				page_token: existing.page_token
			};
		}
		return existing;
	}
};
