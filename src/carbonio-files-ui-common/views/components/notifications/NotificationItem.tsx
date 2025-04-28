/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { Divider } from '@zextras/carbonio-design-system';

import {
	AddedNode,
	NewShare,
	Notification,
	NotificationType,
	RemovedNode
} from '../../../types/graphql/types';

type NotificationItemProps = {
	notification: Notification;
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

export const NotificationItem = ({ notification }: NotificationItemProps): React.JSX.Element => {
	if (isNewShareNotification(notification)) {
		return (
			<>
				<div>{`${notification.triggering_user.email} shared "${notification.node.name}" with you`}</div>
				<Divider />
			</>
		);
	}
	if (isAddedNodeNotification(notification)) {
		return (
			<>
				<div>{`${notification.triggering_user.email} added "${notification.added_node.name}" in ${notification.destination_folder.name}`}</div>
				<div>{`${notification.added_node_type} ${notification.added_node.folder_id}`}</div>
				<Divider />
			</>
		);
	}
	if (isRemovedNodeNotification(notification)) {
		return (
			<>
				<div>{`${notification.triggering_user.email} removed "${notification.removed_node.name}" in ${notification.origin_folder.name}`}</div>
				<div>{`${notification.removed_node_type} ${notification.removed_node.folder_id}`}</div>
				<Divider />
			</>
		);
	}

	return <div>Unknown</div>;
};
