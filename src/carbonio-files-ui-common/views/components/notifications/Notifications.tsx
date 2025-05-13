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
	List,
	Theme
} from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import styled, { css } from 'styled-components';

import { EmptyNotifications } from './EmptyNotifications';
import { NotificationItem } from './NotificationItem';
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
	$paddingSize?: string;
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
	${({ $paddingSize }): ReturnType<typeof css> | undefined | string =>
		$paddingSize &&
		css`
			padding: ${$paddingSize};
		`};
`;

export const Notifications = (): React.JSX.Element => {
	const { notifications, hasMore, loadMore, lastSeen, refetch } = useGetNotificationsQuery();
	const [t] = useTranslation();
	const [open, setOpen] = useState(false);
	const prevOpenRef = useRef(open);
	const [popoverClosed, setPopoverClosed] = useState(false);
	const anchorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (prevOpenRef.current && !open) {
			setPopoverClosed(true);
		}
		prevOpenRef.current = open;
	}, [open]);

	const handleClick = (): void => {
		setOpen((prevState) => !prevState);
		showNotificationsBadgeVar(false);
	};

	const items = useMemo(
		() =>
			notifications?.reduce((accumulator, notification) => {
				if (notification !== null && lastSeen) {
					accumulator.push(
						<NotificationItem
							key={notification?.id}
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
		refetch().then(() => {
			setPopoverClosed(false);
		});
	}, [refetch]);

	return (
		<>
			<StyledButton
				$iconSize={'large'}
				$paddingSize={'0'}
				ref={anchorRef}
				onClick={handleClick}
				icon={open ? 'ChevronLeft' : 'ChevronRight'}
				type={'ghost'}
				color={'text'}
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
