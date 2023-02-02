/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { forEach } from 'lodash';
import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import buildClient from '../apollo';
import CHILD from '../graphql/fragments/child.graphql';
import {
	MoveNodesMutation,
	MoveNodesMutationVariables,
	ChildFragment,
	Folder
} from '../types/graphql/types';

const handleMoveNodesRequest: ResponseResolver<
	GraphQLRequest<MoveNodesMutationVariables>,
	GraphQLContext<MoveNodesMutation>,
	MoveNodesMutation
> = (req, res, ctx) => {
	const { node_ids: nodeIds, destination_id: destinationId } = req.variables;

	const apolloClient = buildClient();

	const nodes: MoveNodesMutation['moveNodes'] = [];

	forEach(nodeIds, (nodeId) => {
		// try to read the node as a file
		let node = apolloClient.readFragment<ChildFragment>({
			fragmentName: 'Child',
			fragment: CHILD,
			id: `File:${nodeId}`
		});

		if (!node) {
			// if result is null, try to read the node as a folder
			node = apolloClient.readFragment<ChildFragment>({
				fragmentName: 'Child',
				fragment: CHILD,
				id: `Folder:${nodeId}`
			});
		}

		if (node) {
			const newNode = { ...node, parent: { __typename: 'Folder', id: destinationId } as Folder };

			nodes.push(newNode);
		}
	});

	return res(
		ctx.data({
			moveNodes: nodes
		})
	);
};

export default handleMoveNodesRequest;
