/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { ApolloQueryResult, QueryResult, useQuery } from '@apollo/client';

import {
	GetNotificationsDocument,
	GetNotificationsQuery,
	GetNotificationsQueryVariables
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export interface GetNotificationsQueryHookReturnType
	extends QueryResult<GetNotificationsQuery, GetNotificationsQueryVariables> {
	hasMore: boolean;
	loadMore: () => Promise<ApolloQueryResult<GetNotificationsQuery>>;
	pageToken: string | null | undefined;
}

export function useGetNotificationsQuery(): GetNotificationsQueryHookReturnType {
	const { data, fetchMore, error, ...queryResult } = useQuery<
		GetNotificationsQuery,
		GetNotificationsQueryVariables
	>(GetNotificationsDocument, {
		variables: {
			update_last_seen: true
		},
		// skip: !nodeId,
		notifyOnNetworkStatusChange: true,
		errorPolicy: 'all',
		returnPartialData: true
	});
	useErrorHandler(error, 'GET_NOTIFICATIONS');

	const loadMore = useCallback(
		() =>
			fetchMore<GetNotificationsQuery, GetNotificationsQueryVariables>({
				variables: {
					page_token: data?.getNotifications?.page_token,
					update_last_seen: false
				}
			}).catch((err) => {
				console.error(err);
				return err;
			}),
		[fetchMore, data]
	);

	return {
		...queryResult,
		// TODO
		fetchMore,
		hasMore: data?.getNotifications?.page_token !== null,
		pageToken: data?.getNotifications?.page_token,
		data,
		error,
		loadMore
	};
}
