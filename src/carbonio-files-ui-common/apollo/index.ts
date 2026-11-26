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

import { typePolicies } from './typePolicies';
import { GRAPHQL_ENDPOINT } from '../constants';
import introspection from '../types/graphql/possible-types';
import { getFilesApiVersionHeaders } from '../utils/filesApiVersion';

const cache = new InMemoryCache({
	possibleTypes: introspection.possibleTypes,
	typePolicies
});

let apolloClient: ApolloClient<NormalizedCacheObject>;

const filesApiVersionLink = new ApolloLink((operation, forward) => {
	operation.setContext(({ headers }: { headers?: Record<string, string> }) => ({
		headers: { ...headers, ...getFilesApiVersionHeaders() }
	}));
	return forward(operation);
});

const buildClient: () => ApolloClient<NormalizedCacheObject> = () => {
	const uri = process.env.NODE_ENV === 'test' ? 'http://localhost:9000' : '';
	if (apolloClient == null) {
		const httpLink = new HttpLink({
			uri: `${uri}${GRAPHQL_ENDPOINT}`,
			credentials: 'same-origin'
		});

		apolloClient = new ApolloClient<NormalizedCacheObject>({
			cache,
			connectToDevTools: process.env.NODE_ENV !== 'production',
			link: ApolloLink.from([filesApiVersionLink, httpLink])
		});
	}
	return apolloClient;
};

export default buildClient;
