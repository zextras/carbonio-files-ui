/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo, useRef, useState } from 'react';

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
import styled from 'styled-components';

import { useGetNotificationsQuery } from '../../../hooks/graphql/queries/useGetNotificationsQuery';
import { GlobalProvidersWrapper } from '../ProvidersWrapper';
import { NotificationItem } from './NotificationItem';

const CustomPopover = styled(Popover)`
	& > div > div {
		background-color: ${({ theme }): string => theme.palette.gray5.regular};
	}
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
	const intersectionObserverInitOptions = useMemo(() => ({ threshold: 0.5 }), []);
	const { data } = useGetNotificationsQuery();
	const [showBadge, setShowBadge] = useState(true);

	const [open, setOpen] = useState(false);
	const anchorRef = useRef<HTMLDivElement>(null);

	const handleClick = (): void => {
		setOpen((prevState) => !prevState);
		setShowBadge(false);
	};

	const items = useMemo(
		() =>
			data?.getNotifications?.notifications.map((notification) => {
				if (notification !== null) {
					return <NotificationItem key={notification?.id} notification={notification} />;
				}
				return <div key={Math.random()} />;
			}) ?? [],
		[data]
	);

	return (
		<>
			<Container width={'3rem'} height={'3rem'} style={{ position: 'relative' }}>
				{showBadge && !!data?.getNotifications?.unread && (
					<MiniBadge
						color={'gray6'}
						backgroundColor={'primary'}
						data-testid={'badge-counter'}
						value={data.getNotifications.unread}
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
				<Container minWidth={'24rem'} padding={'0.5rem'} height={'auto'} maxHeight={'50vh'}>
					<Container orientation={'row'} mainAlignment={'space-between'}>
						<Text weight={'bold'} size={'medium'}>
							Notifications
						</Text>
						<Tooltip label={'Refresh'} placement="top">
							<Button
								icon={'Refresh'}
								type={'ghost'}
								onClick={() => console.log('refresh')}
								size={'large'}
								color={'text'}
							/>
						</Tooltip>
					</Container>
					<Divider />
					<List
						data-testid="main-list"
						background={'gray6'}
						onListBottom={undefined}
						intersectionObserverInitOptions={intersectionObserverInitOptions}
					>
						{items}
					</List>
				</Container>
			</CustomPopover>
		</>
	);
};

export const NotificationsWrapper = (): React.JSX.Element => (
	<GlobalProvidersWrapper>
		<Notification />
	</GlobalProvidersWrapper>
);
