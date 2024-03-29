/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { populateLinks, populateNode } from './mockUtils';
import { ROOTS } from '../constants';
import { GetLinksQuery, GetLinksQueryVariables } from '../types/graphql/types';

const handleGetLinksRequest: ResponseResolver<
	GraphQLRequest<GetLinksQueryVariables>,
	GraphQLContext<GetLinksQuery>,
	GetLinksQuery
> = (req, res, ctx) => {
	const { node_id: id } = req.variables;

	let nodeName = faker.word.words();
	if (id.trim() === ROOTS.LOCAL_ROOT) {
		nodeName = 'ROOT';
	}
	const node = populateNode(undefined, id, nodeName);

	const linksLimit = faker.number.int({ min: 0, max: 50 });
	node.links = populateLinks({ ...node, links: [] }, linksLimit);

	return res(
		ctx.data({
			getLinks: node.links
		})
	);
};

export default handleGetLinksRequest;
