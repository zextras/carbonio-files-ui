/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, GraphQLRequest, ResponseResolver } from 'msw';

import { GetAccountByEmailQuery, GetAccountByEmailQueryVariables } from '../types/graphql/types';
import { populateUser } from './mockUtils';

const handleGetAccountByEmailRequest: ResponseResolver<
	GraphQLRequest<GetAccountByEmailQueryVariables>,
	GraphQLContext<GetAccountByEmailQuery>,
	GetAccountByEmailQuery
> = (req, res, ctx) => {
	const { email } = req.variables;

	const user = populateUser();
	user.email = email;

	return res(
		ctx.data({
			getAccountByEmail: user
		})
	);
};

export default handleGetAccountByEmailRequest;
