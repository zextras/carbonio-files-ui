/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { DeleteNodesMutation, DeleteNodesMutationVariables } from '../types/graphql/types';

const handleDeleteNodesRequest: GraphQLResponseResolver<
	DeleteNodesMutation,
	DeleteNodesMutationVariables
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
			deleteNodes: result
		}
	});
};

export default handleDeleteNodesRequest;
