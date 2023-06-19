/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import {
	GetCollaborationLinksQuery,
	GetCollaborationLinksQueryVariables,
	GetNodeLinksQuery
} from '../types/graphql/types';

const handleGetNodeCollaborationLinksRequest: ResponseResolver<
	GraphQLRequest<GetCollaborationLinksQueryVariables>,
	GraphQLContext<GetCollaborationLinksQuery>,
	GetNodeLinksQuery
> = (req, res, ctx) =>
	res(
		ctx.data({
			getCollaborationLinks: []
		})
	);

export default handleGetNodeCollaborationLinksRequest;
