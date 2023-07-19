/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Resolvers } from '../types/graphql/types';

function resolveByTypename<T>(obj: { __typename?: T }): T {
	if (obj.__typename) {
		return obj.__typename;
	}
	throw new Error('typename is undefined');
}

export const resolvers: Resolvers = {
	Node: {
		__resolveType: resolveByTypename
	}
};
