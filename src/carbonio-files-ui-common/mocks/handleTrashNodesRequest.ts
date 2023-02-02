/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { TrashNodesMutation, TrashNodesMutationVariables } from '../types/graphql/types';

const handleTrashNodesRequest: ResponseResolver<
	GraphQLRequest<TrashNodesMutationVariables>,
	GraphQLContext<TrashNodesMutation>,
	TrashNodesMutation
> = (req, res, ctx) => {
	const { node_ids: nodes } = req.variables;

	let result = null;
	if (nodes) {
		if (nodes instanceof Array) {
			result = nodes;
		} else {
			result = [nodes];
		}
	}

	return res(
		ctx.data({
			trashNodes: result
		})
	);
};

export default handleTrashNodesRequest;
