/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

import { populateUser } from './mockUtils';
import { GetAccountByEmailQuery, GetAccountByEmailQueryVariables } from '../types/graphql/types';

const handleGetAccountByEmailRequest: GraphQLResponseResolver<
	GetAccountByEmailQuery,
	GetAccountByEmailQueryVariables
> = ({ variables }) => {
	const { email } = variables;

	const user = populateUser();
	user.email = email;

	return HttpResponse.json({
		data: {
			getAccountByEmail: user
		}
	});
};

export default handleGetAccountByEmailRequest;
