/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ApolloClient, HttpLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client';

import { GRAPHQL_ENDPOINT } from '../constants';
import introspection from '../types/graphql/possible-types';
import { typePolicies } from './typePolicies';

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

		apolloClient = new ApolloClient<NormalizedCacheObject>({
			cache,
			// TODO: disable in production
			connectToDevTools: true,
			link: httpLink
		});
	}
	return apolloClient;
};

export default buildClient;
