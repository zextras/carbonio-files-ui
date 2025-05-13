/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { FieldFunctionOptions, FieldPolicy, Reference } from '@apollo/client';

import { GetNotificationsQueryVariables, NotificationPage } from '../../../types/graphql/types';

type CachedNotificationPage = Omit<NotificationPage, 'notifications'> & {
	notifications: Array<Reference>;
};

export const getNotificationsFieldPolicy: FieldPolicy<
	CachedNotificationPage,
	CachedNotificationPage,
	CachedNotificationPage,
	FieldFunctionOptions<Partial<GetNotificationsQueryVariables>>
> = {
	keyArgs: false,
	merge(existing, incoming, { args }) {
		if (!args || args.update_last_seen) {
			return incoming;
		}
		return {
			...incoming,
			last_seen: existing?.last_seen ?? incoming?.last_seen,
			notifications: [...(existing?.notifications ?? []), ...incoming.notifications]
		};
	}
};
