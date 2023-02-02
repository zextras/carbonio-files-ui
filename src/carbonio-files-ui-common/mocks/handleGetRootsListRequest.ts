/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { ROOTS } from '../constants';
import { GetRootsListQuery, GetRootsListQueryVariables } from '../types/graphql/types';

const handleGetRootsListRequest: ResponseResolver<
	GraphQLRequest<GetRootsListQueryVariables>,
	GraphQLContext<GetRootsListQuery>,
	GetRootsListQuery
> = (req, res, ctx) =>
	res(
		ctx.data({
			getRootsList: [
				{
					id: ROOTS.LOCAL_ROOT,
					name: 'ROOT',
					__typename: 'Root'
				},
				{
					id: ROOTS.TRASH,
					name: 'TRASH_ROOT',
					__typename: 'Root'
				}
			]
		})
	);

export default handleGetRootsListRequest;
