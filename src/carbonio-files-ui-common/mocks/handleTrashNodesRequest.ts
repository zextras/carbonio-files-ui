/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { TrashNodesMutation, TrashNodesMutationVariables } from '../types/graphql/types';

const handleTrashNodesRequest: GraphQLResponseResolver<
	TrashNodesMutation,
	TrashNodesMutationVariables
> = ({ variables }) => {
	const { node_ids: nodes } = variables;

	let result = null;
	if (nodes) {
		if (nodes instanceof Array) {
			result = nodes;
		} else {
			result = [nodes];
		}
	}

	return HttpResponse.json({
		data: {
			trashNodes: result
		}
	});
};

export default handleTrashNodesRequest;
