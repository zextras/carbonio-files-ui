/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { GetPermissionsQuery, GetPermissionsQueryVariables } from '../types/graphql/types';
import { populatePermissions } from './mockUtils';

const handleGetPermissionsRequest: ResponseResolver<
	GraphQLRequest<GetPermissionsQueryVariables>,
	GraphQLContext<GetPermissionsQuery>,
	GetPermissionsQuery
> = (req, res, ctx) => {
	const { node_id: id } = req.variables;
	const permissions = populatePermissions();
	return res(
		ctx.data({
			getNode: {
				id,
				__typename: 'Folder',
				permissions
			}
		})
	);
};

export default handleGetPermissionsRequest;
