/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { DeleteShareMutation, DeleteShareMutationVariables } from '../types/graphql/types';

const handleDeleteShareRequest: ResponseResolver<
	GraphQLRequest<DeleteShareMutationVariables>,
	GraphQLContext<DeleteShareMutation>,
	DeleteShareMutation
> = (req, res, ctx) =>
	res(
		ctx.data({
			deleteShare: true
		})
	);

export default handleDeleteShareRequest;
