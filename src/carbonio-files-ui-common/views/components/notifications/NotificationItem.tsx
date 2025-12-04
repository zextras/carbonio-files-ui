/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useMemo } from 'react';

import styled from '@emotion/styled';
import { Avatar, Container, Divider, Text } from '@zextras/carbonio-design-system';
import { Trans, useTranslation } from 'react-i18next';

import { useNavigation } from '../../../../hooks/useNavigation';
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

const CustomContainer = styled(Container)`
	margin: 0.5rem 0;
	border-radius: 1rem;
	cursor: pointer;
	&:hover {
		background-color: ${({ theme }): string => theme.palette.gray6.hover};
	}
`;

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
	const { navigateTo, navigateToFolder } = useNavigation();

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

	const handleClick = useCallback((): void => {
		if (isNewShareNotification(notification) || isTransferredOwnershipNotification(notification)) {
			// opens the file or folder using the "copy item's shortcut" function behavior
			navigateToFolder('');
		}
		if (isAddedNodeNotification(notification)) {
			// opens the destination folder with the added item already selected and highlighted, showing the details panel
			navigateTo(``);
		}
		if (isRemovedNodeNotification(notification)) {
			// opens the origin folder attempting to select the removed item, thus triggering the snackbar that notifies the item's unavailability
			navigateTo(``);
		}
		if (isTransferredOwnershipNotification(notification)) {
			// opens the file or folder using the "copy item's shortcut" function behavior
			navigateTo(``);
		}
	}, [navigateTo, navigateToFolder, notification]);

	return (
		<Container mainAlignment={'flex-start'} crossAlignment={'flex-start'}>
			<CustomContainer
				orientation={'horizontal'}
				gap={'0.5rem'}
				mainAlignment={'flex-start'}
				crossAlignment={'flex-start'}
				padding={'0.5rem'}
				onClick={handleClick}
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
			</CustomContainer>
			<Divider />
		</Container>
	);
};
