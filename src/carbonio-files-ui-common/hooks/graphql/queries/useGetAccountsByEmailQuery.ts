/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { LazyQueryExecFunction, useLazyQuery } from '@apollo/client';

import {
	GetAccountsByEmailDocument,
	GetAccountsByEmailQuery,
	GetAccountsByEmailQueryVariables
} from '../../../types/graphql/types';

type UseGetAccountsByEmailQueryReturnType = LazyQueryExecFunction<
	GetAccountsByEmailQuery,
	GetAccountsByEmailQueryVariables
>;

export function useGetAccountsByEmailQuery(): UseGetAccountsByEmailQueryReturnType {
	const [getAccountsByEmailLazyQuery] = useLazyQuery(GetAccountsByEmailDocument, {
		fetchPolicy: 'no-cache',
		errorPolicy: 'all'
	});

	return getAccountsByEmailLazyQuery;
}
