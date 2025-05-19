/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { faker } from '@faker-js/faker';
import { GraphQLResponseResolver, HttpResponse } from 'msw';

import {
	populateAddedNodeNotification,
	populateNewShareNotification,
	populateRemovedNodeNotification
} from './mockUtils';
import { GetNotificationsQuery, GetNotificationsQueryVariables } from '../types/graphql/types';

const handleGetNotificationsRequest: GraphQLResponseResolver<
	GetNotificationsQuery,
	GetNotificationsQueryVariables
> = () => {
	const addedNode = populateAddedNodeNotification();
	const newShare = populateNewShareNotification();
	const removedNode = populateRemovedNodeNotification();
	const notifications = [addedNode, newShare, removedNode];

	const unread =
		notifications.length > 0 ? faker.number.int({ min: 0, max: notifications.length }) : 0;

	const slicedNotifications = notifications.slice(0, 25);
	const pageToken =
		slicedNotifications.length > 25 ? notifications[notifications.length - 1].id : null;

	return HttpResponse.json({
		data: {
			getNotifications: {
				__typename: 'NotificationPage',
				last_seen: faker.date.recent().getTime(),
				notifications,
				page_token: pageToken,
				unread
			}
		}
	});
};
export default handleGetNotificationsRequest;
