/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { FC, forwardRef } from 'react';

import { Container, Icon } from '@zextras/carbonio-design-system';
import { BadgeInfo } from '@zextras/carbonio-shell-ui';
import styled from 'styled-components';

const MiniBadge = styled(Icon)`
	position: absolute;
	bottom: 25%;
	right: 25%;
	transform: translate(30%, 30%);
	user-select: none;
	cursor: pointer;
	pointer-events: none;
	z-index: 99;
`;

// eslint-disable-next-line react/display-name
const BadgeWrap: FC<{ badge: BadgeInfo }> = forwardRef<HTMLDivElement, { badge: BadgeInfo }>(
	({ badge, children }, ref) => (
		<Container width={'3rem'} height={'3rem'} style={{ position: 'relative' }} ref={ref}>
			{badge.show && <MiniBadge color={badge.color} icon="AlertCircle" />}
			{children}
		</Container>
	)
);

export default BadgeWrap;
