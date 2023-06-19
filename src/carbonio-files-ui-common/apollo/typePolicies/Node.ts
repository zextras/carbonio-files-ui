/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldFunctionOptions, TypePolicy } from '@apollo/client';
import { map } from 'lodash';

import { ShareCachedObject, SharesCachedObject } from '../../types/apollo';
import { Node } from '../../types/common';
import { NodeSharesArgs } from '../../types/graphql/types';

export const nodeTypePolicies: TypePolicy = {
	merge: true,
	fields: {
		shares: {
			keyArgs: false,
			merge(
				existing: SharesCachedObject,
				incoming: ShareCachedObject[],
				{ args }: FieldFunctionOptions<Partial<NodeSharesArgs>>
			): SharesCachedObject {
				if (args?.cursor) {
					const newExisting = existing.shares || [];
					return {
						args,
						shares: [...newExisting, ...incoming]
					};
				}
				// return the already cached data when:
				// a previous query requested a greater number of shares (cached limit is greater than args limit)
				// or
				// cached shares number is lower than the previous query limit
				// (so even requesting a greater limit, the returned share will be the same of the already cached)
				if (
					existing?.args?.limit !== undefined &&
					(args?.limit === undefined ||
						existing.args.limit >= args.limit ||
						existing.shares.length < existing.args.limit)
				) {
					return existing;
				}
				return { args, shares: [...incoming] };
			},
			read(
				existing: SharesCachedObject,
				{ args, readField, toReference }: FieldFunctionOptions<Partial<NodeSharesArgs>>
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
					existing &&
					(existing?.args?.limit === undefined ||
						args?.limit === undefined ||
						existing.args.limit >= args.limit ||
						existing.shares.length < existing.args.limit)
				) {
					const nodeId = readField<string>('id');
					const nodeTypeName = readField<Node['__typename']>('__typename');
					return map(existing.shares, (share) => ({
						...share,
						node: toReference({ __typename: nodeTypeName, id: nodeId })
					}));
				}
				// otherwise, if
				// there is no cached data
				// or
				// a query is requesting a number of shares greater than the cached data,
				// return undefined to force the network request
				return undefined;
			}
		}
	}
};
