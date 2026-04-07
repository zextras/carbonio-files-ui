/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useMemo } from 'react';

import { useApolloClient } from '@apollo/client';
import styled from '@emotion/styled';
import { Avatar, Container, Divider, Text, useSnackbar } from '@zextras/carbonio-design-system';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { FILES_ROUTE, INTERNAL_PATH, ROOTS } from '../../../constants';
import {
	AddedNode,
	NewShare,
	Notification,
	NotificationType,
	RemovedNode,
	TransferredOwnership,
	SucceededRecording
} from '../../../types/graphql/types';
import { InlineText } from '../StyledComponents';

type NotificationItemProps = {
	notification: Notification;
	isUnread: boolean;
	closePopover: () => void;
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

export function isSucceededRecordingNotification(
	notification: Notification
): notification is SucceededRecording {
	return notification.notification_type === NotificationType.SucceededRecording;
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
	isUnread,
	closePopover
}: NotificationItemProps): React.JSX.Element => {
	const {
		i18n: { language }
	} = useTranslation();
	const [t] = useTranslation();
	const date = getDateNotification(notification.created_at, language);
	const navigate = useNavigate();
	const { resetStore } = useApolloClient();
	const createSnackbar = useSnackbar();

	const notificationMessage = useMemo(() => {
		const boldComponent = (
			<InlineText overflow={'break-word'} weight="bold" color={isUnread ? 'primary' : 'text'} />
		);
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
						bold: boldComponent
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
						folder:
							notification.destination_folder.node_id.trim() === ROOTS.LOCAL_ROOT
								? t('secondaryBar.filesHome', 'Home')
								: notification.destination_folder.name
					}}
					components={{
						bold: boldComponent
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
						folder:
							notification.origin_folder.node_id.trim() === ROOTS.LOCAL_ROOT
								? t('secondaryBar.filesHome', 'Home')
								: notification.origin_folder.name
					}}
					components={{
						bold: boldComponent
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
						bold: boldComponent
					}}
				/>
			);
		}
		if (isSucceededRecordingNotification(notification)) {
			return (
				<Trans
					t={t}
					i18nKey="notifications.succeededRecording.message"
					defaults="<bold>{{node}}</bold> saved in <bold>{{folder}}</bold>"
					values={{
						node: notification.recording_node.name,
						folder:
							notification.recording_destination_node.node_id.trim() === ROOTS.LOCAL_ROOT
								? t('secondaryBar.filesHome', 'Home')
								: notification.recording_destination_node.name
					}}
					components={{
						bold: boldComponent
					}}
				/>
			);
		}
		return null;
	}, [isUnread, notification, t]);

	const handleClick = useCallback((): void => {
		closePopover();
		if (isNewShareNotification(notification)) {
			navigate({
				search: `${notification.node.type === 'FOLDER' ? 'folder' : 'file'}=${notification.node.node_id}`,
				pathname: `/${FILES_ROUTE}`
			});
		}
		if (isTransferredOwnershipNotification(notification)) {
			navigate({
				search: `folder=${notification.resulting_node.node_id}`,
				pathname: `/${FILES_ROUTE}`
			});
		}
		if (isAddedNodeNotification(notification)) {
			resetStore();
			navigate({
				search: [
					`folder=${notification.destination_folder.node_id}`,
					`node=${notification.added_node.node_id}`
				].join('&')
			});
		}
		if (isRemovedNodeNotification(notification)) {
			resetStore();
			if (notification.notification_type === NotificationType.RemovedNode) {
				createSnackbar({
					key: new Date().toLocaleString(),
					severity: 'warning',
					label: t(
						'errorCode.code_NODE_NOT_FOUND',
						"It seems that this item doesn't exist, or you do not have permission to access it"
					)
				});
				navigate({
					search: `folder=${notification.origin_folder.node_id}`
				});
			} else {
				navigate({
					search: [
						`folder=${notification.origin_folder.node_id}`,
						`node=${notification.removed_node.node_id}`
					].join('&')
				});
			}
		}
		if (isSucceededRecordingNotification(notification)) {
			resetStore();
			const folderId = notification.recording_destination_node.node_id.trim();
			const nodeId = notification.recording_node.node_id.trim();
			navigate({
				search: `node=${nodeId}`,
				pathname: `/${FILES_ROUTE}/${INTERNAL_PATH.ROOT}/${folderId}`
			});
		}
	}, [closePopover, notification, navigate, resetStore, createSnackbar, t]);

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
				<Avatar
					label={
						isSucceededRecordingNotification(notification) ? '' : notification.triggering_user.email
					}
					icon={isSucceededRecordingNotification(notification) ? 'Settings' : undefined}
				/>
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
