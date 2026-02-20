/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { DeleteSharesMutation, DeleteSharesMutationVariables } from '../types/graphql/types';

const handleDeleteSharesRequest: GraphQLResponseResolver<
	DeleteSharesMutation,
	DeleteSharesMutationVariables
> = ({ variables }) =>
	HttpResponse.json({
		data: {
			deleteShares: Array.isArray(variables.share_target_ids)
				? variables.share_target_ids
				: [variables.share_target_ids]
		}
	});

export default handleDeleteSharesRequest;
