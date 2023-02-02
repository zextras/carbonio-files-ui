/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { map } from 'lodash';
import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { ROOTS } from '../constants';
import CHILD from '../graphql/fragments/child.graphql';
import {
	ChildFragment,
	RestoreNodesMutation,
	RestoreNodesMutationVariables
} from '../types/graphql/types';

function readDataFromCache(nodeId: string): ChildFragment | null {
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
	return node;
}

const handleRestoreNodesRequest: ResponseResolver<
	GraphQLRequest<RestoreNodesMutationVariables>,
	GraphQLContext<RestoreNodesMutation>,
	RestoreNodesMutation
> = (req, res, ctx) => {
	const { node_ids: nodes } = req.variables;

	let result: RestoreNodesMutation['restoreNodes'] = null;
	if (nodes) {
		if (nodes instanceof Array) {
			result = map(nodes, (nodeId) => {
				const cachedNode = readDataFromCache(nodeId);
				return {
					...cachedNode,
					id: nodeId,
					parent: {
						__typename: 'Folder',
						id: ROOTS.LOCAL_ROOT
					},
					rootId: ROOTS.LOCAL_ROOT
				};
			});
		} else {
			const cachedNode = readDataFromCache(nodes);
			result = [
				{
					...cachedNode,
					id: nodes,
					parent: {
						__typename: 'Folder',
						id: ROOTS.LOCAL_ROOT
					},
					rootId: ROOTS.LOCAL_ROOT
				}
			];
		}
	}

	return res(
		ctx.data({
			restoreNodes: result
		})
	);
};

export default handleRestoreNodesRequest;
