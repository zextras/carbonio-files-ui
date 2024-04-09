/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { populatePermissions } from './mockUtils';
import { GetPermissionsQuery, GetPermissionsQueryVariables } from '../types/graphql/types';

const handleGetPermissionsRequest: GraphQLResponseResolver<
	GetPermissionsQuery,
	GetPermissionsQueryVariables
> = ({ variables }) => {
	const { node_id: id } = variables;
	const permissions = populatePermissions();
	return HttpResponse.json({
		data: {
			getNode: {
				id,
				__typename: 'Folder',
				permissions
			}
		}
	});
};

export default handleGetPermissionsRequest;
