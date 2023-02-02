/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { map } from 'lodash';
import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { GetVersionsQuery, GetVersionsQueryVariables } from '../types/graphql/types';
import { getVersionFromFile, populateFile } from './mockUtils';

const handleGetVersionsRequest: ResponseResolver<
	GraphQLRequest<GetVersionsQueryVariables>,
	GraphQLContext<GetVersionsQuery>,
	GetVersionsQuery
> = (req, res, ctx) => {
	const { versions } = req.variables;

	if (versions && versions instanceof Array) {
		const file = populateFile();

		const resVersions = map(versions, (version) => getVersionFromFile({ ...file, version }));

		return res(
			ctx.data({
				getVersions: resVersions
			})
		);
	}
	const fileVersion1 = populateFile();
	fileVersion1.version = 1;
	const version1 = getVersionFromFile(fileVersion1);
	return res(
		ctx.data({
			getVersions: [version1]
		})
	);
};

export default handleGetVersionsRequest;
