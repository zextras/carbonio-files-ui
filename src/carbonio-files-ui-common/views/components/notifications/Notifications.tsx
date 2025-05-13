/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
	Button,
	Container,
	Popover,
	Text,
	Tooltip,
	Divider,
	List
} from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { EmptyNotifications } from './EmptyNotifications';
import { NotificationItem } from './NotificationItem';
import { isNotificationsBadgeCounterShownVar } from '../../../apollo/isNotificationsBadgeCounterShownVar';
import { useGetNotificationsQuery } from '../../../hooks/graphql/queries/useGetNotificationsQuery';

const CustomPopover = styled(Popover)`
	& > div > div {
		background-color: ${({ theme }): string => theme.palette.gray5.regular};
	}
`;

const CustomList = styled(List)`
	display: flex;
`;

export const Notifications = (): React.JSX.Element => {
	const { notifications, hasMore, loadMore, lastSeen, refetch, unread } =
		useGetNotificationsQuery();
	const [t] = useTranslation();
	const [open, setOpen] = useState(false);
	const hasRefetched = useRef(false);
	const prevOpenRef = useRef(open);
	const [popoverClosed, setPopoverClosed] = useState(false);
	const anchorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (prevOpenRef.current && !open) {
			setPopoverClosed(true);
		}
		prevOpenRef.current = open;
	}, [open]);

	const handleClick = useCallback(() => {
		setOpen((prevState) => !prevState);
		isNotificationsBadgeCounterShownVar(false);
		if (!hasRefetched.current && unread && unread > 0) {
			refetch({ update_last_seen: true }).then(() => setPopoverClosed(false));
		}
		hasRefetched.current = true;
	}, [refetch, unread]);

	const items = useMemo(
		() =>
			notifications?.reduce((accumulator, notification, id) => {
				if (notification !== null && lastSeen) {
					accumulator.push(
						<NotificationItem
							key={`${notification?.id}-${id}`}
							notification={notification}
							isUnread={popoverClosed ? false : notification.created_at > lastSeen}
						/>
					);
				}
				return accumulator;
			}, [] as Array<React.JSX.Element>) ?? [],
		[notifications, lastSeen, popoverClosed]
	);

	const refetchCallback = useCallback(() => {
		refetch({ update_last_seen: true }).then(() => {
			setPopoverClosed(false);
		});
	}, [refetch]);

	return (
		<>
			<Button
				ref={anchorRef}
				onClick={handleClick}
				icon={open ? 'ChevronLeft' : 'ChevronRight'}
				type={'ghost'}
				color={'text'}
				size={'large'}
			/>
			<CustomPopover
				open={open}
				anchorEl={anchorRef}
				styleAsModal
				placement="right-start"
				onClose={() => setOpen(false)}
			>
				<Container minWidth={'24rem'} maxWidth={'20rem'} padding={'0.5rem'}>
					<Container
						orientation={'row'}
						mainAlignment={'space-between'}
						padding={{ bottom: '0.5rem' }}
					>
						<Text weight={'bold'}>{t('notifications.title', 'Notifications')}</Text>
						<Tooltip label={t('notifications.refresh', 'Refresh')} placement="top">
							<Button
								icon={'Refresh'}
								type={'ghost'}
								onClick={refetchCallback}
								size={'large'}
								color={'text'}
							/>
						</Tooltip>
					</Container>
					<Divider />
					{notifications?.length === 0 ? (
						<EmptyNotifications />
					) : (
						<CustomList
							height={'auto'}
							maxHeight={'50vh'}
							data-testid="main-list"
							background={'gray6'}
							onListBottom={hasMore ? loadMore : undefined}
						>
							{items}
						</CustomList>
					)}
				</Container>
			</CustomPopover>
		</>
	);
};
