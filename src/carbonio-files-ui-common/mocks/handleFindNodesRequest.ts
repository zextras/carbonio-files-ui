/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { take } from 'lodash';
import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { populateNode, populateNodePage, populateShares, sortNodes } from './mockUtils';
import { ROOTS } from '../constants';
import { FindNodesQuery, FindNodesQueryVariables } from '../types/graphql/types';

const handleFindNodesRequest: GraphQLResponseResolver<FindNodesQuery, FindNodesQueryVariables> = ({
	variables
}) => {
	const {
		keywords,
		flagged,
		shared_with_me: sharedWithMe,
		shared_by_me: sharedByMe,
		limit,
		sort,
		folder_id: folderId,
		shares_limit: sharesLimit
	} = variables;

	const nodes = [];

	if (!flagged && !sharedWithMe && !sharedByMe && !folderId && !keywords) {
		return HttpResponse.json({
			errors: [{ message: 'MSW handleFindNodesRequest: Invalid parameters in findNodes request' }]
		});
	}

	for (let i = 0; i < faker.number.int({ min: 1, max: limit }); i += 1) {
		const node = populateNode();
		if (flagged) {
			node.flagged = true;
		}
		if (folderId === ROOTS.TRASH) {
			node.rootId = ROOTS.TRASH;
		}
		const sharesNum = faker.number.int({ min: 0, max: sharesLimit || 1 });
		node.shares = take(node.shares, sharesNum);
		if ((sharedByMe || sharedWithMe) && node.shares.length < 1) {
			node.shares = populateShares(node, faker.number.int({ min: 1, max: sharesLimit || 1 }));
		} else if (sharedByMe === false && sharedWithMe === false) {
			node.shares = [];
		}
		node.permissions.can_delete = true;
		node.permissions.can_write_folder = true;
		node.permissions.can_write_file = true;
		nodes.push(node);
	}

	if (sort) {
		sortNodes(nodes, sort);
	}

	return HttpResponse.json({
		data: {
			findNodes: populateNodePage(nodes, limit)
		}
	});
};

export default handleFindNodesRequest;
