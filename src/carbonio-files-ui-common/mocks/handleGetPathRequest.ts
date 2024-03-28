/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { populateFolder, populateLocalRoot, populateParents } from './mockUtils';
import { ROOTS } from '../constants';
import { GetPathQuery, GetPathQueryVariables } from '../types/graphql/types';

const handleGetPathRequest: GraphQLResponseResolver<GetPathQuery, GetPathQueryVariables> = ({
	variables
}) => {
	const { node_id: id } = variables;

	const { path } = populateParents(populateFolder(0, id), faker.number.int(15));
	if (id !== ROOTS.LOCAL_ROOT) {
		path.unshift(populateLocalRoot());
	}

	return HttpResponse.json({
		data: {
			getPath: path
		}
	});
};

export default handleGetPathRequest;
