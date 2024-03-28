/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { DeleteShareMutation, DeleteShareMutationVariables } from '../types/graphql/types';

const handleDeleteShareRequest: GraphQLResponseResolver<
	DeleteShareMutation,
	DeleteShareMutationVariables
> = () =>
	HttpResponse.json({
		data: {
			deleteShare: true
		}
	});

export default handleDeleteShareRequest;
