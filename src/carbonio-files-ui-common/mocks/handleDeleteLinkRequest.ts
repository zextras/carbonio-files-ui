/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { DeleteLinksMutation, DeleteLinksMutationVariables } from '../types/graphql/types';

const handleDeleteLinksRequest: ResponseResolver<
	GraphQLRequest<DeleteLinksMutationVariables>,
	GraphQLContext<DeleteLinksMutation>,
	DeleteLinksMutation
> = (req, res, ctx) => {
	const { link_ids: linkIds } = req.variables;

	const result = linkIds instanceof Array ? linkIds : [linkIds];

	return res(
		ctx.data({
			deleteLinks: result
		})
	);
};

export default handleDeleteLinksRequest;
