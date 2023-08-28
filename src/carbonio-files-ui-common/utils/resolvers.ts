/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { NODES_LOAD_LIMIT } from '../constants';
import { populateNodePage } from '../mocks/mockUtils';
import { FolderResolvers, NodeResolvers, Resolvers } from '../types/graphql/resolvers-types';

function resolveByTypename<T>(obj: { __typename?: T }): T {
	if (obj.__typename) {
		return obj.__typename;
	}
	throw new Error(`typename is undefined in object ${obj}`);
}

const defaultSharesResolver: NodeResolvers['shares'] = (parent, args) =>
	parent.shares.slice(0, args.limit);

const defaultChildrenResolver: FolderResolvers['children'] = (parent, args) => {
	if (args.page_token !== undefined && args.page_token !== null) {
		return populateNodePage(parent.children.nodes.slice(NODES_LOAD_LIMIT, NODES_LOAD_LIMIT * 2));
	}
	return populateNodePage(parent.children.nodes.slice(0, NODES_LOAD_LIMIT));
};

export const resolvers = {
	Node: {
		__resolveType: resolveByTypename
	},
	File: {
		shares: defaultSharesResolver
	},
	Folder: {
		children: defaultChildrenResolver,
		shares: defaultSharesResolver
	},
	SharedTarget: {
		__resolveType: resolveByTypename
	},
	Account: {
		__resolveType: resolveByTypename
	}
} satisfies Resolvers;
