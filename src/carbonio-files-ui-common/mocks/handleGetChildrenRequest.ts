/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { forEach, take } from 'lodash';
import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { ROOTS } from '../constants';
import { GetChildrenQuery, GetChildrenQueryVariables } from '../types/graphql/types';
import { populateFolder, sortNodes } from './mockUtils';

const handleGetChildrenRequest: ResponseResolver<
	GraphQLRequest<GetChildrenQueryVariables>,
	GraphQLContext<GetChildrenQuery>,
	GetChildrenQuery
> = (req, res, ctx) => {
	const {
		node_id: parentNode,
		children_limit: childrenLimit,
		sort,
		shares_limit: sharesLimit
	} = req.variables;

	let parentNodeName = faker.random.words();
	if (parentNode.trim() === ROOTS.LOCAL_ROOT) {
		parentNodeName = 'ROOT';
	}

	const childrenNum = faker.datatype.number({ min: 0, max: childrenLimit });

	const folder = populateFolder(childrenNum, parentNode, parentNodeName);

	forEach(folder.children.nodes, (mockedNode) => {
		if (mockedNode) {
			const sharesNum = faker.datatype.number({ min: 0, max: sharesLimit || 1 });
			mockedNode.shares = take(mockedNode.shares, sharesNum);
		}
	});

	if (sort) {
		sortNodes(folder.children.nodes, sort);
	}

	return res(
		ctx.delay(),
		ctx.data({
			getNode: folder
		})
	);
};

export default handleGetChildrenRequest;
