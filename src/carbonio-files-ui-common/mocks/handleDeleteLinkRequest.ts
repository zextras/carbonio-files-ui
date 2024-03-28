/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { DeleteLinksMutation, DeleteLinksMutationVariables } from '../types/graphql/types';

const handleDeleteLinksRequest: GraphQLResponseResolver<
	DeleteLinksMutation,
	DeleteLinksMutationVariables
> = ({ variables }) => {
	const { link_ids: linkIds } = variables;

	const result = linkIds instanceof Array ? linkIds : [linkIds];

	return HttpResponse.json({
		data: {
			deleteLinks: result
		}
	});
};

export default handleDeleteLinksRequest;
