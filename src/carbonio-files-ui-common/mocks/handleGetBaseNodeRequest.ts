/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { ROOTS } from '../constants';
import { GetBaseNodeQuery, GetBaseNodeQueryVariables } from '../types/graphql/types';
import { populateNode } from './mockUtils';

const handleGetBaseNodeRequest: ResponseResolver<
	GraphQLRequest<GetBaseNodeQueryVariables>,
	GraphQLContext<GetBaseNodeQuery>,
	GetBaseNodeQuery
> = (req, res, ctx) => {
	const { node_id: id } = req.variables;

	let nodeName = faker.random.words();
	if (id.trim() === ROOTS.LOCAL_ROOT) {
		nodeName = 'ROOT';
	}
	const node = populateNode(undefined, id, nodeName);

	return res(
		ctx.data({
			getNode: node
		})
	);
};

export default handleGetBaseNodeRequest;
