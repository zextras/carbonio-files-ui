/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { map } from 'lodash';
import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { getVersionFromFile, populateFile } from './mockUtils';
import { GetVersionsQuery, GetVersionsQueryVariables } from '../types/graphql/types';

const handleGetVersionsRequest: GraphQLResponseResolver<
	GetVersionsQuery,
	GetVersionsQueryVariables
> = ({ variables }) => {
	const { versions } = variables;

	if (versions && versions instanceof Array) {
		const file = populateFile();

		const resVersions = map(versions, (version) => getVersionFromFile({ ...file, version }));

		return HttpResponse.json({
			data: {
				getVersions: resVersions
			}
		});
	}
	const fileVersion1 = populateFile();
	fileVersion1.version = 1;
	const version1 = getVersionFromFile(fileVersion1);
	return HttpResponse.json({
		data: {
			getVersions: [version1]
		}
	});
};

export default handleGetVersionsRequest;
