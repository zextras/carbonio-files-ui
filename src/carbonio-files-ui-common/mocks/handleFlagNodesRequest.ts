/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { FlagNodesMutation, FlagNodesMutationVariables } from '../types/graphql/types';

const handleFlagNodesRequest: GraphQLResponseResolver<
	FlagNodesMutation,
	FlagNodesMutationVariables
> = ({ variables }) => {
	const { node_ids: ids } = variables;
	return HttpResponse.json({
		data: {
			flagNodes: (ids as string[]) || []
		}
	});
};

export default handleFlagNodesRequest;
