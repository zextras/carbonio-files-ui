/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { populateNode } from './mockUtils';
import { ROOTS } from '../constants';
import { GetBaseNodeQuery, GetBaseNodeQueryVariables } from '../types/graphql/types';

const handleGetBaseNodeRequest: GraphQLResponseResolver<
	GetBaseNodeQuery,
	GetBaseNodeQueryVariables
> = ({ variables }) => {
	const { node_id: id } = variables;

	let nodeName = faker.word.words();
	if (id.trim() === ROOTS.LOCAL_ROOT) {
		nodeName = 'ROOT';
	}
	const node = populateNode(undefined, id, nodeName);

	return HttpResponse.json({
		data: {
			getNode: node
		}
	});
};

export default handleGetBaseNodeRequest;
