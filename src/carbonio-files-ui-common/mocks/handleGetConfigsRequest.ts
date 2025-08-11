/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { populateConfigs } from './mockUtils';
import { GetConfigsQuery, GetConfigsQueryVariables } from '../types/graphql/types';

const handleGetConfigsRequest: GraphQLResponseResolver<
	GetConfigsQuery,
	GetConfigsQueryVariables
> = () =>
	HttpResponse.json({
		data: {
			getConfigs: populateConfigs()
		}
	});

export default handleGetConfigsRequest;
