/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { take } from 'lodash';
import { GraphQLContext, GraphQLRequest, ResponseResolver, ResponseTransformer } from 'msw';

import { ROOTS } from '../constants';
import { FindNodesQuery, FindNodesQueryVariables } from '../types/graphql/types';
import { populateNode, populateNodePage, populateShares, sortNodes } from './mockUtils';

const handleFindNodesRequest: ResponseResolver<
	GraphQLRequest<FindNodesQueryVariables>,
	GraphQLContext<FindNodesQuery>,
	FindNodesQuery
> = (req, res, ctx) => {
	const {
		keywords,
		flagged,
		shared_with_me: sharedWithMe,
		shared_by_me: sharedByMe,
		limit,
		sort,
		folder_id: folderId,
		shares_limit: sharesLimit
	} = req.variables;

	const nodes = [];

	if (!flagged && !sharedWithMe && !sharedByMe && !folderId && !keywords) {
		return res(
			ctx.errors([
				{ message: 'MSW handleFindNodesRequest: Invalid parameters in findNodes request' }
			]) as ResponseTransformer
		);
	}

	for (let i = 0; i < faker.datatype.number({ min: 1, max: limit }); i += 1) {
		const node = populateNode();
		if (flagged) {
			node.flagged = true;
		}
		if (folderId === ROOTS.TRASH) {
			node.rootId = ROOTS.TRASH;
		}
		const sharesNum = faker.datatype.number({ min: 0, max: sharesLimit || 1 });
		node.shares = take(node.shares, sharesNum);
		if ((sharedByMe || sharedWithMe) && node.shares.length < 1) {
			node.shares = populateShares(node, faker.datatype.number({ min: 1, max: sharesLimit || 1 }));
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

	return res(
		ctx.data({
			findNodes: populateNodePage(nodes, limit)
		})
	);
};

export default handleFindNodesRequest;
