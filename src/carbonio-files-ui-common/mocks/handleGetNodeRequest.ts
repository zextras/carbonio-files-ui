/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { forEach, take } from 'lodash';
import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { ROOTS } from '../constants';
import { GetNodeQuery, GetNodeQueryVariables } from '../types/graphql/types';
import {
	populateLinks,
	populateNode,
	populateNodePage,
	populateNodes,
	sortNodes
} from './mockUtils';

const handleGetNodeRequest: ResponseResolver<
	GraphQLRequest<GetNodeQueryVariables>,
	GraphQLContext<GetNodeQuery>,
	GetNodeQuery
> = (req, res, ctx) => {
	const {
		node_id: id,
		children_limit: childrenLimit,
		sort,
		shares_limit: sharesLimit
	} = req.variables;

	let nodeName = faker.random.words();
	if (id.trim() === ROOTS.LOCAL_ROOT) {
		nodeName = 'ROOT';
	}
	const node = populateNode(undefined, id, nodeName);

	const sharesNum = faker.datatype.number({ min: 0, max: sharesLimit || 1 });
	node.shares = take(node.shares, sharesNum);

	if (node.__typename === 'Folder') {
		const childrenNum = faker.datatype.number({ min: 0, max: childrenLimit });
		node.children = populateNodePage(populateNodes(childrenNum));
		forEach(node.children.nodes, (mockedNode) => {
			if (mockedNode) {
				mockedNode.shares = take(mockedNode.shares, sharesNum);
			}
		});

		if (sort) {
			sortNodes(node.children.nodes, sort);
		}
	}

	const linksLimit = faker.datatype.number({ min: 0, max: 50 });
	node.links = populateLinks(node, linksLimit);

	return res(
		ctx.data({
			getNode: node
		})
	);
};

export default handleGetNodeRequest;
