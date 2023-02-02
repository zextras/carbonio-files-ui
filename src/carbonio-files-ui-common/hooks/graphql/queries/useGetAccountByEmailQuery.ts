/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useLazyQuery } from '@apollo/client';
import { LazyQueryResult, QueryLazyOptions } from '@apollo/client/react/types/types';

import GET_ACCOUNT_BY_EMAIL from '../../../graphql/queries/getAccountByEmail.graphql';
import {
	GetAccountByEmailQuery,
	GetAccountByEmailQueryVariables
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

type UseGetAccountByEmailQueryReturnType = (
	options?: QueryLazyOptions<GetAccountByEmailQueryVariables>
) => Promise<LazyQueryResult<GetAccountByEmailQuery, GetAccountByEmailQueryVariables>>;

export function useGetAccountByEmailQuery(): UseGetAccountByEmailQueryReturnType {
	const [getAccountByEmailLazyQuery, { error }] = useLazyQuery<
		GetAccountByEmailQuery,
		GetAccountByEmailQueryVariables
	>(GET_ACCOUNT_BY_EMAIL, { fetchPolicy: 'no-cache' });

	useErrorHandler(error, 'GET_ACCOUNT_BY_EMAIL');

	return getAccountByEmailLazyQuery;
}
