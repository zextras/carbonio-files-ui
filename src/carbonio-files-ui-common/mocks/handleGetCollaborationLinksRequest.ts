/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import {
	GetCollaborationLinksQuery,
	GetCollaborationLinksQueryVariables
} from '../types/graphql/types';

const handleGetCollaborationLinksRequest: GraphQLResponseResolver<
	GetCollaborationLinksQuery,
	GetCollaborationLinksQueryVariables
> = () =>
	HttpResponse.json({
		data: {
			getCollaborationLinks: []
		}
	});

export default handleGetCollaborationLinksRequest;
