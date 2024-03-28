/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { forEach, take } from 'lodash';
import { GraphQLResponseResolver, HttpResponse } from 'msw';

import {
	populateLinks,
	populateNode,
	populateNodePage,
	populateNodes,
	sortNodes
} from './mockUtils';
import { ROOTS } from '../constants';
import { GetNodeQuery, GetNodeQueryVariables } from '../types/graphql/types';

const handleGetNodeRequest: GraphQLResponseResolver<GetNodeQuery, GetNodeQueryVariables> = ({
	variables
}) => {
	const { node_id: id, children_limit: childrenLimit, sort, shares_limit: sharesLimit } = variables;

	let nodeName = faker.word.words();
	if (id.trim() === ROOTS.LOCAL_ROOT) {
		nodeName = 'ROOT';
	}
	const node = populateNode(undefined, id, nodeName);

	const sharesNum = faker.number.int({ min: 0, max: sharesLimit || 1 });
	node.shares = take(node.shares, sharesNum);

	if (node.__typename === 'Folder') {
		const childrenNum = faker.number.int({ min: 0, max: childrenLimit });
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

	const linksLimit = faker.number.int({ min: 0, max: 50 });
	node.links = populateLinks(node, linksLimit);

	return HttpResponse.json({
		data: {
			getNode: node
		}
	});
};

export default handleGetNodeRequest;
