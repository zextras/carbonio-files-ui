/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { ROOTS } from '../constants';
import CHILD from '../graphql/fragments/child.graphql';
import { Node } from '../types/common';
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

const handleRestoreNodesRequest: GraphQLResponseResolver<
	RestoreNodesMutation,
	RestoreNodesMutationVariables
> = ({ variables }) => {
	const { node_ids: nodes } = variables;

	let result: RestoreNodesMutation['restoreNodes'] = null;
	if (nodes) {
		if (nodes instanceof Array) {
			result = nodes.map((nodeId) => {
				const cachedNode = readDataFromCache(nodeId);
				return {
					__typename: faker.helpers.arrayElement<Node['__typename']>(['File', 'Folder']),
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
					__typename: faker.helpers.arrayElement<Node['__typename']>(['File', 'Folder']),
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

	return HttpResponse.json({
		data: {
			restoreNodes: result
		}
	});
};

export default handleRestoreNodesRequest;
