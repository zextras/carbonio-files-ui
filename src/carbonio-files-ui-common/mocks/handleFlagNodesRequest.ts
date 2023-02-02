/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { FlagNodesMutation, FlagNodesMutationVariables } from '../types/graphql/types';

const handleFlagNodesRequest: ResponseResolver<
	GraphQLRequest<FlagNodesMutationVariables>,
	GraphQLContext<FlagNodesMutation>,
	FlagNodesMutation
> = (req, res, ctx) => {
	const { node_ids: ids } = req.variables;
	return res(
		ctx.data({
			flagNodes: (ids as string[]) || []
		})
	);
};

export default handleFlagNodesRequest;
