/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { Avatar, Container, Divider, Text } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

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
	const date = getDateNotification(notification.created_at, language);

	if (isNewShareNotification(notification)) {
		return (
			<Container mainAlignment={'flex-start'} crossAlignment={'flex-start'}>
				{/* right 0.25rem serve per evitare che la scritta della notifica sia attaccata allo scrollbar */}
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
							color={isUnread ? 'info' : 'text'}
							lineHeight={1.3125}
							style={{ wordBreak: 'break-word' }}
						>{`${notification.triggering_user.email} shared ${notification.node.name} with you`}</Text>
						<Text color={'secondary'} size={'small'}>
							{date}
						</Text>
					</Container>
				</Container>
				<Divider />
			</Container>
		);
	}
	if (isAddedNodeNotification(notification)) {
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
							color={isUnread ? 'info' : 'text'}
							lineHeight={1.3125}
							style={{ wordBreak: 'break-word' }}
						>
							{`${notification.triggering_user.email} added ${notification.added_node.name} in ${notification.destination_folder.name}`}
						</Text>
						<Text color={'secondary'} size={'small'}>
							{date}
						</Text>
					</Container>
				</Container>
				<Divider />
			</Container>
		);
	}
	if (isRemovedNodeNotification(notification)) {
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
							color={isUnread ? 'info' : 'text'}
							lineHeight={1.5}
							style={{ wordBreak: 'break-word' }}
						>
							{`${notification.triggering_user.email} removed ${notification.removed_node.name} from ${notification.origin_folder.name}`}
						</Text>
						<Text color={'secondary'} size={'small'}>
							{date}
						</Text>
					</Container>
				</Container>
				<Divider />
			</Container>
		);
	}

	return <div>Unknown</div>;
};
