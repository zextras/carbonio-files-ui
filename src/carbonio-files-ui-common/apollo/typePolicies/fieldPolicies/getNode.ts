/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldFunctionOptions, FieldPolicy, Reference } from '@apollo/client';
import { find } from 'lodash';

import introspection from '../../../types/graphql/possible-types';
import { GetNodeQueryVariables, QueryGetNodeArgs } from '../../../types/graphql/types';

export const getNodeFieldPolicy: FieldPolicy<
	Reference,
	Reference,
	Reference,
	FieldFunctionOptions<Partial<QueryGetNodeArgs>, Partial<GetNodeQueryVariables>>
> = {
	read(_, fieldFunctionOptions): Reference | undefined {
		const { args, toReference, canRead } = fieldFunctionOptions as FieldFunctionOptions<
			QueryGetNodeArgs,
			GetNodeQueryVariables
		>;
		if (args?.node_id) {
			const typename = find(introspection.possibleTypes.Node, (nodePossibleType) => {
				const nodeRef = toReference({
					__typename: nodePossibleType,
					id: args.node_id
				});
				return canRead(nodeRef);
			});

			return toReference({
				__typename: typename,
				id: args.node_id
			});
		}
		return undefined;
	}
};
