/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { populateFolder, populateLocalRoot, populateParents } from './mockUtils';
import { ROOTS } from '../constants';
import { GetPathQuery, GetPathQueryVariables } from '../types/graphql/types';

const handleGetPathRequest: ResponseResolver<
	GraphQLRequest<GetPathQueryVariables>,
	GraphQLContext<GetPathQuery>,
	GetPathQuery
> = (req, res, ctx) => {
	const { node_id: id } = req.variables;

	const { path } = populateParents(populateFolder(0, id), faker.number.int(15));
	if (id !== ROOTS.LOCAL_ROOT) {
		path.unshift(populateLocalRoot());
	}

	return res(
		ctx.data({
			getPath: path
		})
	);
};

export default handleGetPathRequest;
