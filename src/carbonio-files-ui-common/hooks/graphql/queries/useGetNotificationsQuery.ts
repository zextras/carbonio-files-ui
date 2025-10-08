/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { ApolloQueryResult, QueryResult, useQuery } from '@apollo/client';

import { useIsCarbonioCE } from '../../../../hooks/useIsCarbonioCE';
import {
	GetCeNotificationsDocument,
	GetNotificationsDocument,
	GetNotificationsQuery,
	GetNotificationsQueryVariables,
	Notification
} from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export interface GetNotificationsQueryHookReturnType {
	notifications: Array<Notification | null> | undefined;
	hasMore: boolean;
	loadMore: () => Promise<ApolloQueryResult<GetNotificationsQuery>>;
	pageToken: string | null | undefined;
	error: QueryResult['error'] | undefined;
	lastSeen: number | null | undefined;
	unread: number | null | undefined;
	refetch: () => Promise<ApolloQueryResult<GetNotificationsQuery>>;
}

export function useGetNotificationsQuery(): GetNotificationsQueryHookReturnType {
	const isCarbonioCE = useIsCarbonioCE() ?? true;

	const { data, fetchMore, error, refetch } = useQuery<
		GetNotificationsQuery,
		GetNotificationsQueryVariables
	>(isCarbonioCE ? GetCeNotificationsDocument : GetNotificationsDocument, {
		variables: {
			update_last_seen: true
		},
		fetchPolicy: 'cache-first',
		nextFetchPolicy: 'cache-only',
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
		notifications: data?.getNotifications?.notifications,
		hasMore: data?.getNotifications?.page_token !== null,
		pageToken: data?.getNotifications?.page_token,
		error,
		loadMore,
		lastSeen: data?.getNotifications?.last_seen,
		unread: data?.getNotifications?.unread,
		refetch
	};
}
