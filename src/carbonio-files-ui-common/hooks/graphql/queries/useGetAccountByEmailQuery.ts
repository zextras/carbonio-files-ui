/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useLazyQuery, LazyQueryExecFunction } from '@apollo/client';

import {
	GetAccountByEmailDocument,
	GetAccountByEmailQuery,
	GetAccountByEmailQueryVariables
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

type UseGetAccountByEmailQueryReturnType = LazyQueryExecFunction<
	GetAccountByEmailQuery,
	GetAccountByEmailQueryVariables
>;

export function useGetAccountByEmailQuery(): UseGetAccountByEmailQueryReturnType {
	const [getAccountByEmailLazyQuery, { error }] = useLazyQuery(GetAccountByEmailDocument, {
		fetchPolicy: 'no-cache'
	});

	useErrorHandler(error, 'GET_ACCOUNT_BY_EMAIL');

	return getAccountByEmailLazyQuery;
}
