/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useLazyQuery } from '@apollo/client';
import { LazyQueryResult, QueryLazyOptions } from '@apollo/client/react/types/types';

import GET_ACCOUNTS_BY_EMAIL from '../../../graphql/queries/getAccountsByEmail.graphql';
import {
	GetAccountsByEmailQuery,
	GetAccountsByEmailQueryVariables
} from '../../../types/graphql/types';

type UseGetAccountsByEmailQueryReturnType = (
	options?: QueryLazyOptions<GetAccountsByEmailQueryVariables>
) => Promise<LazyQueryResult<GetAccountsByEmailQuery, GetAccountsByEmailQueryVariables>>;

export function useGetAccountsByEmailQuery(): UseGetAccountsByEmailQueryReturnType {
	const [getAccountsByEmailLazyQuery] = useLazyQuery<
		GetAccountsByEmailQuery,
		GetAccountsByEmailQueryVariables
	>(GET_ACCOUNTS_BY_EMAIL, { fetchPolicy: 'no-cache', errorPolicy: 'all' });

	// useErrorHandler(error, 'GET_ACCOUNTS_BY_EMAIL');

	return getAccountsByEmailLazyQuery;
}
