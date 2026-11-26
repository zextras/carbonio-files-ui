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
import { setContext } from '@apollo/client/link/context';
import { RetryLink } from '@apollo/client/link/retry';

import { typePolicies } from './typePolicies';
import { GRAPHQL_ENDPOINT, HTTP_STATUS_CODE } from '../constants';
import introspection from '../types/graphql/possible-types';
import {
	getFilesApiVersionHeaders,
	isUnsupportedVersionBody,
	resetFilesApi
} from '../utils/filesApiVersion';

const cache = new InMemoryCache({
	possibleTypes: introspection.possibleTypes,
	typePolicies
});

let apolloClient: ApolloClient<NormalizedCacheObject>;

const filesApiVersionLink = setContext(async (_, { headers }) => ({
	headers: { ...headers, ...(await getFilesApiVersionHeaders()) }
}));

const retryUnsupportedVersionLink = new RetryLink({
	delay: { initial: 0, jitter: false },
	attempts: (count, _operation, error): boolean => {
		if (count > 1 || error?.statusCode !== HTTP_STATUS_CODE.unprocessableEntity) {
			return false;
		}
		const body = error.result ?? error.bodyText;
		if (!isUnsupportedVersionBody(typeof body === 'string' ? body : JSON.stringify(body))) {
			return false;
		}
		resetFilesApi();
		return true;
	}
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
			link: ApolloLink.from([retryUnsupportedVersionLink, filesApiVersionLink, httpLink])
		});
	}
	return apolloClient;
};

export default buildClient;
