/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useMemo } from 'react';

import { Avatar, Container, Divider, Text } from '@zextras/carbonio-design-system';
import { Trans, useTranslation } from 'react-i18next';

import {
	AddedNode,
	NewShare,
	Notification,
	NotificationType,
	RemovedNode,
	TransferredOwnership
} from '../../../types/graphql/types';
import { InlineText } from '../StyledComponents';

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

export function isTransferredOwnershipNotification(
	notification: Notification
): notification is TransferredOwnership {
	return notification.notification_type === NotificationType.TransferredOwnership;
}

export function getDateNotification(createdAt: number, language?: string): string {
	const fixedLocale = language?.replace('_', '-');
	const format: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	};
	return Intl.DateTimeFormat(fixedLocale, format).format(createdAt);
}

export const NotificationItem = ({
	notification,
	isUnread
}: NotificationItemProps): React.JSX.Element => {
	const {
		i18n: { language }
	} = useTranslation();
	const [t] = useTranslation();
	const date = getDateNotification(notification.created_at, language);

	const notificationMessage = useMemo(() => {
		if (isNewShareNotification(notification)) {
			return (
				<Trans
					t={t}
					i18nKey="notifications.newShare.message"
					defaults="<bold>{{email}}</bold> shared <bold>{{node}}</bold> with you"
					values={{
						email: notification.triggering_user.email,
						node: notification.node.name
					}}
					components={{
						bold: (
							<InlineText
								overflow={'break-word'}
								weight="bold"
								color={isUnread ? 'primary' : 'text'}
							/>
						)
					}}
				/>
			);
		}
		if (isAddedNodeNotification(notification)) {
			return (
				<Trans
					t={t}
					i18nKey="notifications.addedNode.message"
					defaults="<bold>{{email}}</bold> added <bold>{{node}}</bold> in <bold>{{folder}}</bold>"
					values={{
						email: notification.triggering_user.email,
						node: notification.added_node.name,
						folder: notification.destination_folder.name
					}}
					components={{
						bold: (
							<InlineText
								overflow={'break-word'}
								weight="bold"
								color={isUnread ? 'primary' : 'text'}
							/>
						)
					}}
				/>
			);
		}
		if (isRemovedNodeNotification(notification)) {
			return (
				<Trans
					t={t}
					i18nKey="notifications.removedNode.message"
					defaults="<bold>{{email}}</bold> removed <bold>{{node}}</bold> from <bold>{{folder}}</bold>"
					values={{
						email: notification.triggering_user.email,
						node: notification.removed_node.name,
						folder: notification.origin_folder.name
					}}
					components={{
						bold: (
							<InlineText
								overflow={'break-word'}
								weight="bold"
								color={isUnread ? 'primary' : 'text'}
							/>
						)
					}}
				/>
			);
		}
		if (isTransferredOwnershipNotification(notification)) {
			return (
				<Trans
					t={t}
					i18nKey="notifications.transferredOwnership.message"
					defaults="<bold>{{email}}</bold> transferred ownership of items to you. You’ll find them in folder <bold>{{folder}}</bold>"
					values={{
						email: notification.triggering_user.email,
						folder: notification.resulting_node.name
					}}
					components={{
						bold: (
							<InlineText
								overflow={'break-word'}
								weight="bold"
								color={isUnread ? 'primary' : 'text'}
							/>
						)
					}}
				/>
			);
		}
		return null;
	}, [isUnread, notification, t]);

	return (
		<Container mainAlignment={'flex-start'} crossAlignment={'flex-start'}>
			<Container
				orientation={'horizontal'}
				gap={'0.5rem'}
				mainAlignment={'flex-start'}
				crossAlignment={'flex-start'}
				padding={{ vertical: '1rem', right: '0.25rem' }}
			>
				<Avatar label={notification.triggering_user.email} />
				<Container mainAlignment={'flex-start'} crossAlignment={'flex-start'} gap={'0.5rem'}>
					<Text
						overflow={'break-word'}
						color={isUnread ? 'primary' : 'text'}
						style={{ wordBreak: 'break-word' }}
					>
						{notificationMessage}
					</Text>
					<Text color={'secondary'} size={'small'}>
						{date}
					</Text>
				</Container>
			</Container>
			<Divider />
		</Container>
	);
};
