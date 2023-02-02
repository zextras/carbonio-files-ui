/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldFunctionOptions, TypePolicy } from '@apollo/client';

import { ShareCachedObject, SharesCachedObject } from '../../types/apollo';
import { NodeSharesArgs } from '../../types/graphql/types';

export const nodeTypePolicies: TypePolicy = {
	merge: true,
	fields: {
		shares: {
			keyArgs: false,
			merge(
				existing: ShareCachedObject[],
				incoming: ShareCachedObject[],
				{ args }: FieldFunctionOptions<Partial<NodeSharesArgs>>
			): SharesCachedObject {
				if (args?.cursor) {
					const newExisting = existing || [];
					return {
						args,
						shares: [...newExisting, ...incoming]
					};
				}
				return { args, shares: [...incoming] };
			},
			read(
				existing: SharesCachedObject,
				{ args }: FieldFunctionOptions<Partial<NodeSharesArgs>>
			): ShareCachedObject[] | undefined {
				// return the already cached data when:
				// cached data is missing
				// or
				// no arg limit is passed
				// or
				// a previous query requested a greater number of shares (cached limit is greater than args limit)
				// or
				// cached shares number is lower than the previous query limit
				// (so even requesting a greater limit, the returned share will be the same of the already cached)
				if (
					!existing?.args?.limit ||
					!args?.limit ||
					existing.args.limit >= args.limit ||
					existing.shares.length < existing.args.limit
				) {
					return existing?.shares;
				}
				// otherwise, if a query is requesting a number of shares grater then the cached data,
				// return undefined to force the network request
				return undefined;
			}
		}
	}
};
