/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { Container, Divider, Text } from '@zextras/carbonio-design-system';

import {
	AddedNode,
	NewShare,
	Notification,
	NotificationType,
	RemovedNode
} from '../../../types/graphql/types';

type NotificationItemProps = {
	notification: Notification;
	isUnread: boolean;
};

export function isNewShareNotification(notification: Notification): notification is NewShare {
	return notification.notification_type === NotificationType.NewShare;
}

export function isAddedNodeNotification(notification: Notification): notification is AddedNode {
	return notification.notification_type === NotificationType.AddedNode;
}

export function isRemovedNodeNotification(notification: Notification): notification is RemovedNode {
	return notification.notification_type === NotificationType.RemovedNode;
}

export const NotificationItem = ({
	notification,
	isUnread
}: NotificationItemProps): React.JSX.Element => {
	if (isNewShareNotification(notification)) {
		return (
			<Container>
				<Text
					overflow={'break-word'}
					color={isUnread ? 'info' : 'text'}
				>{`${notification.triggering_user.email} shared ${notification.node.name} with you`}</Text>
				<Divider />
			</Container>
		);
	}
	if (isAddedNodeNotification(notification)) {
		return (
			<Container>
				<Text
					overflow={'break-word'}
					color={isUnread ? 'info' : 'text'}
				>{`${notification.triggering_user.email} added ${notification.added_node.name} in ${notification.destination_folder.name}`}</Text>
				<Divider />
			</Container>
		);
	}
	if (isRemovedNodeNotification(notification)) {
		return (
			<Container>
				<Text
					overflow={'break-word'}
					color={isUnread ? 'info' : 'text'}
				>{`${notification.triggering_user.email} removed ${notification.removed_node.name} from ${notification.origin_folder.name}`}</Text>
				<Divider />
			</Container>
		);
	}

	return <div>Unknown</div>;
};
