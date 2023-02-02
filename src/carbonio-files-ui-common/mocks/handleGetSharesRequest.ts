/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { take } from 'lodash';
import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { ROOTS } from '../constants';
import { GetSharesQuery, GetSharesQueryVariables } from '../types/graphql/types';
import { populateNode } from './mockUtils';

const handleGetSharesRequest: ResponseResolver<
	GraphQLRequest<GetSharesQueryVariables>,
	GraphQLContext<GetSharesQuery>,
	GetSharesQuery
> = (req, res, ctx) => {
	const { node_id: id, shares_limit: sharesLimit } = req.variables;

	let nodeName = faker.random.words();
	if (id.trim() === ROOTS.LOCAL_ROOT) {
		nodeName = 'ROOT';
	}
	const node = populateNode(undefined, id, nodeName);

	const sharesNum = faker.datatype.number({ min: 0, max: sharesLimit || 1 });
	node.shares = take(node.shares, sharesNum);

	return res(
		ctx.data({
			getNode: node
		})
	);
};

export default handleGetSharesRequest;
