/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import buildClient from '../apollo';
import CHILD from '../graphql/fragments/child.graphql';
import { Node } from '../types/common';
import {
	ChildFragment,
	UpdateNodeDescriptionMutation,
	UpdateNodeDescriptionMutationVariables,
	UpdateNodeMutation,
	UpdateNodeMutationVariables
} from '../types/graphql/types';

const handleUpdateNodeRequest: ResponseResolver<
	GraphQLRequest<UpdateNodeMutationVariables | UpdateNodeDescriptionMutationVariables>,
	GraphQLContext<UpdateNodeMutation | UpdateNodeDescriptionMutation>,
	UpdateNodeMutation | UpdateNodeDescriptionMutation | string
> = (req, res, ctx) => {
	const { variables } = req;

	const apolloClient = buildClient();

	// try to read the node as a file
	let result = apolloClient.readFragment<ChildFragment>({
		fragmentName: 'Child',
		fragment: CHILD,
		id: `File:${variables.node_id}`
	});

	if (!result) {
		// if result is null, try to read the node as a folder
		result = apolloClient.readFragment<ChildFragment>({
			fragmentName: 'Child',
			fragment: CHILD,
			id: `Folder:${variables.node_id}`
		});
	}

	const name = ('name' in variables && variables.name) || result?.name || '';
	return res(
		ctx.data({
			updateNode: {
				...result,
				name,
				description: variables.description || ''
			} as Node
		})
	);
};

export default handleUpdateNodeRequest;
