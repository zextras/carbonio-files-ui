/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { NODES_LOAD_LIMIT } from '../constants';
import { FileResolvers, FolderResolvers, Resolvers } from '../types/graphql/resolvers-types';

function resolveByTypename<T>(obj: { __typename?: T }): T {
	if (obj.__typename) {
		return obj.__typename;
	}
	throw new Error(`typename is undefined in object ${obj}`);
}

const defaultSharesResolver: FileResolvers['shares'] = (parent, args) =>
	parent.shares.slice(0, args.limit);

const defaultChildrenResolver: FolderResolvers['children'] = (parent, args) => {
	const nodes =
		args.page_token !== undefined && args.page_token !== null
			? parent.children.nodes.slice(NODES_LOAD_LIMIT, NODES_LOAD_LIMIT * 2)
			: parent.children.nodes.slice(0, NODES_LOAD_LIMIT);
	return {
		...parent.children,
		nodes,
		page_token: nodes.length === NODES_LOAD_LIMIT ? 'next_page_token' : null
	};
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
		shares: defaultSharesResolver as unknown as FolderResolvers['shares']
	},
	SharedTarget: {
		__resolveType: resolveByTypename
	},
	Account: {
		__resolveType: resolveByTypename
	},
	Notification: {
		__resolveType: resolveByTypename
	}
} satisfies Resolvers;
