/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useReactiveVar } from '@apollo/client';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import {
	Button,
	Container,
	Popover,
	Text,
	Tooltip,
	Divider,
	List,
	Padding,
	Theme
} from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { EmptyNotifications } from './EmptyNotifications';
import { NotificationItem } from './NotificationItem';
import { lastSeenNotificationsVar } from '../../../apollo/lastSeenNotificationsVar';
import { showNotificationsBadgeVar } from '../../../apollo/showNotificationsBadgeVar';
import { useGetNotificationsQuery } from '../../../hooks/graphql/queries/useGetNotificationsQuery';

const CustomPopover = styled(Popover)`
	& > div > div {
		background-color: ${({ theme }): string => theme.palette.gray5.regular};
	}
`;

const CustomList = styled(List)`
	display: flex;
`;

const StyledButton = styled(Button)<{
	$iconSize?: keyof Theme['sizes']['icon'];
}>`
	${({ $iconSize, theme }): ReturnType<typeof css> | undefined | string =>
		$iconSize &&
		css`
			svg {
				width: ${theme.sizes.icon[$iconSize]};
				min-width: ${theme.sizes.icon[$iconSize]};
				height: ${theme.sizes.icon[$iconSize]};
				min-height: ${theme.sizes.icon[$iconSize]};
			}
		`};
	padding: 0;
`;

export const Notifications = (): React.JSX.Element => {
	const { notifications, hasMore, loadMore, lastSeen, refetch } = useGetNotificationsQuery();
	const lastSeenVar = useReactiveVar(lastSeenNotificationsVar);
	const [t] = useTranslation();
	const [open, setOpen] = useState(false);
	const prevOpenRef = useRef(open);
	const anchorRef = useRef<HTMLDivElement>(null);

	const nonNullNotifications = useMemo(
		() => notifications?.filter((notification) => notification !== null),
		[notifications]
	);

	useEffect(() => {
		if (prevOpenRef.current && !open && nonNullNotifications && nonNullNotifications.length > 0) {
			lastSeenNotificationsVar(nonNullNotifications[0].created_at);
		}
		prevOpenRef.current = open;
	}, [nonNullNotifications, open]);

	const handleClick = (): void => {
		setOpen((prevState) => !prevState);
		showNotificationsBadgeVar(false);
	};

	const items = useMemo(
		() =>
			nonNullNotifications?.reduce((accumulator, notification) => {
				if (lastSeen) {
					accumulator.push(
						<NotificationItem
							key={notification?.id}
							notification={notification}
							isUnread={notification.created_at > Math.max(lastSeen, lastSeenVar)}
							closePopover={() => setOpen(false)}
						/>
					);
				}
				return accumulator;
			}, [] as Array<React.JSX.Element>) ?? [],
		[nonNullNotifications, lastSeen, lastSeenVar]
	);

	return (
		<>
			<Padding left="small">
				<StyledButton
					$iconSize={'large'}
					ref={anchorRef}
					onClick={handleClick}
					icon={open ? 'ChevronLeft' : 'ChevronRight'}
					type={'ghost'}
					color={'text'}
				/>
			</Padding>
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
						<Tooltip label={t('notifications.refresh', 'Check for updates')} placement="top">
							<Button
								icon={'Refresh'}
								type={'ghost'}
								onClick={() => refetch()}
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
