/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { GraphQLResponseResolver, HttpResponse } from 'msw';

import buildClient from '../apollo';
import { Node } from '../types/common';
import {
	ChildFragmentDoc,
	UpdateNodeMutation,
	UpdateNodeMutationVariables
} from '../types/graphql/types';

const handleUpdateNodeRequest: GraphQLResponseResolver<
	UpdateNodeMutation,
	UpdateNodeMutationVariables
> = ({ variables }) => {
	const apolloClient = buildClient();

	// try to read the node as a file
	let result = apolloClient.readFragment({
		fragmentName: 'Child',
		fragment: ChildFragmentDoc,
		id: `File:${variables.node_id}`
	});

	if (!result) {
		// if result is null, try to read the node as a folder
		result = apolloClient.readFragment({
			fragmentName: 'Child',
			fragment: ChildFragmentDoc,
			id: `Folder:${variables.node_id}`
		});
	}

	const name = variables.name ?? result?.name ?? '';
	return HttpResponse.json({
		data: {
			updateNode: {
				id: faker.string.uuid(),
				parent: null,
				__typename: faker.helpers.arrayElement<Node['__typename']>(['File', 'Folder']),
				...result,
				name,
				description: variables.description ?? ''
			}
		}
	});
};

export default handleUpdateNodeRequest;
