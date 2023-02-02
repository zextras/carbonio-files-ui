/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { GetParentQuery, GetParentQueryVariables } from '../types/graphql/types';
import { populateFolder, populateParents } from './mockUtils';

const handleGetParentsRequest: ResponseResolver<
	GraphQLRequest<GetParentQueryVariables>,
	GraphQLContext<GetParentQuery>,
	GetParentQuery
> = (req, res, ctx) => {
	const { node_id: id } = req.variables;

	const { node: currentFolder } = populateParents(populateFolder(0, id), 2);

	return res(
		ctx.data({
			getNode: currentFolder
		})
	);
};

export default handleGetParentsRequest;
