/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { forEach } from 'lodash';
import { GraphQLResponseResolver, HttpResponse } from 'msw';

import buildClient from '../apollo';
import CHILD from '../graphql/fragments/child.graphql';
import {
	CopyNodesMutation,
	CopyNodesMutationVariables,
	ChildFragment,
	Folder
} from '../types/graphql/types';

const handleCopyNodesRequest: GraphQLResponseResolver<
	CopyNodesMutation,
	CopyNodesMutationVariables
> = ({ variables }) => {
	const { node_ids: nodeIds, destination_id: destinationId } = variables;

	const apolloClient = buildClient();

	const nodes: CopyNodesMutation['copyNodes'] = [];

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
			const newNode = {
				...node,
				id: faker.string.uuid(),
				name: `${node.name} - Copy`,
				parent: { __typename: 'Folder', id: destinationId, name: 'parent folder' } as Folder
			};

			nodes.push(newNode);
		}
	});

	return HttpResponse.json({
		data: {
			copyNodes: nodes
		}
	});
};

export default handleCopyNodesRequest;
