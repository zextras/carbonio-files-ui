/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
	ApolloClient,
	ApolloLink,
	HttpLink,
	InMemoryCache,
	NormalizedCacheObject
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';

import { typePolicies } from './typePolicies';
import { GRAPHQL_ENDPOINT } from '../constants';
import introspection from '../types/graphql/possible-types';

const UNAUTHENTICATED_ERROR_CODE = 'UNAUTHENTICATED';

const cache = new InMemoryCache({
	possibleTypes: introspection.possibleTypes,
	typePolicies
});

let apolloClient: ApolloClient<NormalizedCacheObject>;

const buildClient: () => ApolloClient<NormalizedCacheObject> = () => {
	const uri = process.env.NODE_ENV === 'test' ? 'http://localhost:9000' : '';
	if (apolloClient == null) {
		const httpLink = new HttpLink({
			uri: `${uri}${GRAPHQL_ENDPOINT}`,
			credentials: 'same-origin'
		});

		const unauthenticatedLink = onError(({ graphQLErrors, networkError }) => {
			if (graphQLErrors?.some((err) => err.extensions?.errorCode === UNAUTHENTICATED_ERROR_CODE)) {
				window.location.assign('/login');
			}
			if (networkError && 'statusCode' in networkError && networkError.statusCode === 401) {
				window.location.assign('/login');
			}
		});

		apolloClient = new ApolloClient<NormalizedCacheObject>({
			cache,
			connectToDevTools: process.env.NODE_ENV !== 'production',
			link: ApolloLink.from([unauthenticatedLink, httpLink])
		});
	}
	return apolloClient;
};

export default buildClient;
