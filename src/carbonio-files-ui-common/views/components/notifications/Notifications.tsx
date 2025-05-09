/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
	Badge,
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

import { useGetNotificationsQuery } from '../../../hooks/graphql/queries/useGetNotificationsQuery';
import { GlobalProvidersWrapper } from '../ProvidersWrapper';
import { EmptyNotifications } from './EmptyNotifications';
import { NotificationItem } from './NotificationItem';

const CustomPopover = styled(Popover)`
	& > div > div {
		background-color: ${({ theme }): string => theme.palette.gray5.regular};
	}
`;

const CustomList = styled(List)`
	display: flex;
`;

const MiniBadge = styled(Badge)`
	position: absolute;
	top: 10%;
	right: 25%;
	transform: translate(30%, 30%);
	min-width: 1rem;
	min-height: 1rem;
	pointer-events: none;
	z-index: 99;
	padding: 0.125rem;

	& > div {
		font-size: 0.625rem;
		line-height: normal;
	}
`;

export const Notification = (): React.JSX.Element => {
	const { notifications, hasMore, loadMore, lastSeen, unread, refetch } =
		useGetNotificationsQuery();
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

	const [showBadge, setShowBadge] = useState(true);

	const handleClick = (): void => {
		setOpen((prevState) => !prevState);
		setShowBadge(false);
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
			<Tooltip label={t('notifications.button.tooltip', 'Notifications')}>
				<div>
					<Container width={'3rem'} height={'3rem'} style={{ position: 'relative' }}>
						{showBadge && !!unread && (
							<MiniBadge
								color={'gray6'}
								backgroundColor={'primary'}
								data-testid={'badge-counter'}
								value={unread}
							/>
						)}
						<Button
							ref={anchorRef}
							icon={'FilesNotificationsOutline'}
							type={'ghost'}
							onClick={handleClick}
							size={'large'}
							color={'text'}
						/>
					</Container>
					<CustomPopover
						open={open}
						anchorEl={anchorRef}
						styleAsModal
						placement="bottom-end"
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
				</div>
			</Tooltip>
		</>
	);
};

export const NotificationsWrapper = (): React.JSX.Element => (
	<GlobalProvidersWrapper>
		<Notification />
	</GlobalProvidersWrapper>
);
