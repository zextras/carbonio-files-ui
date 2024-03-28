/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { forEach, take } from 'lodash';
import { delay, GraphQLResponseResolver, HttpResponse } from 'msw';

import { populateFolder, sortNodes } from './mockUtils';
import { ROOTS } from '../constants';
import { GetChildrenQuery, GetChildrenQueryVariables } from '../types/graphql/types';

const handleGetChildrenRequest: GraphQLResponseResolver<
	GetChildrenQuery,
	GetChildrenQueryVariables
> = async ({ variables }) => {
	const {
		node_id: parentNode,
		children_limit: childrenLimit,
		sort,
		shares_limit: sharesLimit
	} = variables;

	let parentNodeName = faker.word.words();
	if (parentNode.trim() === ROOTS.LOCAL_ROOT) {
		parentNodeName = 'ROOT';
	}

	const childrenNum = faker.number.int({ min: 0, max: childrenLimit });

	const folder = populateFolder(childrenNum, parentNode, parentNodeName);

	forEach(folder.children.nodes, (mockedNode) => {
		if (mockedNode) {
			const sharesNum = faker.number.int({ min: 0, max: sharesLimit || 1 });
			mockedNode.shares = take(mockedNode.shares, sharesNum);
		}
	});

	if (sort) {
		sortNodes(folder.children.nodes, sort);
	}

	await delay();
	return HttpResponse.json({
		data: {
			getNode: folder
		}
	});
};

export default handleGetChildrenRequest;
