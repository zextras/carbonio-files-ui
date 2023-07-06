/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldFunctionOptions, FieldPolicy, Reference } from '@apollo/client';

import { GetNodeQueryVariables, QueryGetNodeArgs } from '../../../types/graphql/types';
import { findNodeTypeName } from '../../cacheUtils';

export const getNodeFieldPolicy: FieldPolicy<
	Reference,
	Reference,
	Reference,
	FieldFunctionOptions<Partial<QueryGetNodeArgs>, Partial<GetNodeQueryVariables>>
> = {
	read(_, fieldFunctionOptions): Reference | undefined {
		const { args, toReference, canRead } = fieldFunctionOptions;
		if (args?.node_id) {
			const typename = findNodeTypeName(args.node_id, { canRead, toReference });

			return toReference({
				__typename: typename,
				id: args.node_id
			});
		}
		return undefined;
	}
};
