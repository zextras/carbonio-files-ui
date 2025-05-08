/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { Container, Icon, Text } from '@zextras/carbonio-design-system';

export const EmptyNotifications = (): React.JSX.Element => (
	<Container padding={{ top: '1.5rem', bottom: '1rem' }} gap={'1rem'}>
		<Icon
			icon={'BellOffOutline'}
			color={'secondary'}
			style={{ width: '2.625rem', height: '2.625rem' }}
		/>
		<Text size={'large'} color={'secondary'} weight={'bold'}>
			No notifications
		</Text>
		<Text size={'small'} color={'secondary'}>
			You don’t have any notifications at the moment
		</Text>
	</Container>
);
