/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { NodeResolvers, Resolvers } from '../types/graphql/resolvers-types';

function resolveByTypename<T>(obj: { __typename?: T }): T {
	if (obj.__typename) {
		return obj.__typename;
	}
	throw new Error(`typename is undefined in object ${obj}`);
}

const sharesResolver: NodeResolvers['shares'] = (parent, args) =>
	parent.shares.slice(0, args.limit);

export const resolvers = {
	Node: {
		__resolveType: resolveByTypename
	},
	File: {
		shares: sharesResolver
	},
	Folder: {
		shares: sharesResolver
	},
	SharedTarget: {
		__resolveType: resolveByTypename
	},
	Account: {
		__resolveType: resolveByTypename
	}
} satisfies Resolvers;
