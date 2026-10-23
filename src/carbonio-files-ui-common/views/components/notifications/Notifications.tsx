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
	Badge,
	Button,
	Container,
	Popover,
	Text,
	Tooltip,
	Divider,
	List,
	Padding,
	Row,
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

const ButtonWrapper = styled.div`
	position: relative;
	display: inline-flex;
`;

const BadgeWrapper = styled.div`
	position: absolute;
	bottom: 0;
	right: 0;
	pointer-events: none;
	z-index: 1;
`;

export interface NotificationsProps {
	isCollapsed?: boolean;
	label?: string;
}

export const Notifications = ({
	isCollapsed = false,
	label
}: NotificationsProps = {}): React.JSX.Element => {
	const { notifications, hasMore, loadMore, lastSeen, refetch, unread } =
		useGetNotificationsQuery();
	const lastSeenVar = useReactiveVar(lastSeenNotificationsVar);
	const isNotificationsBadgeCounterShown = useReactiveVar(showNotificationsBadgeVar);
	const [t] = useTranslation();
	const [open, setOpen] = useState(false);
	const prevOpenRef = useRef(open);
	const anchorRef = useRef<HTMLDivElement>(null);

	const badgeCounter = !!unread && isNotificationsBadgeCounterShown ? unread : undefined;

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

	const handleClick = (e?: React.SyntheticEvent | KeyboardEvent): void => {
		e?.stopPropagation?.();
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
			{isCollapsed ? (
				<Row mainAlignment="flex-start" takeAvailableSpace>
					<Tooltip label={label ?? t('notifications.title', 'Notifications')} placement="right">
						<Padding all="extrasmall">
							<ButtonWrapper>
								<Button
									size={'extralarge'}
									icon={'BellOutline'}
									ref={anchorRef}
									onClick={handleClick}
									backgroundColor={(open && 'highlight') || 'transparent'}
									labelColor={'text'}
								/>
								{badgeCounter !== undefined && (
									<BadgeWrapper>
										<Badge value={badgeCounter} backgroundColor="primary" color="gray6" />
									</BadgeWrapper>
								)}
							</ButtonWrapper>
						</Padding>
					</Tooltip>
				</Row>
			) : (
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
			)}
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
