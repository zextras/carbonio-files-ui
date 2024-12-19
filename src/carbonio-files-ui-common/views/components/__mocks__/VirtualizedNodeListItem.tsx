/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { Container } from '@zextras/carbonio-design-system';

import { VirtualizedNodeListItem as ActualVirtualizedNodeListItem } from '../VirtualizedNodeListItem';

export const VirtualizedNodeListItem: typeof ActualVirtualizedNodeListItem = ({
	children,
	listRef: _listRef,
	type: _type,
	activeBackground: _activeBackground,
	selectedBackground: _selectedBackground,
	active: _active,
	selected: _selected,
	...props
}) => (
	<Container height={'auto'} width={'auto'} {...props}>
		{children}
	</Container>
);
