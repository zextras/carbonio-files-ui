/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Dropdown, DropdownItem, DropdownProps } from '@zextras/carbonio-design-system';
import styled from 'styled-components';

export interface ContextualMenuProps extends Omit<DropdownProps, 'items' | 'contextMenu'> {
	actions: DropdownItem[];
}

const CustomDropdown = styled(Dropdown)`
	width: 100%;
	height: 100%;
`;

export const ContextualMenu = ({
	children,
	disabled = false,
	onOpen,
	onClose,
	actions,
	disableRestoreFocus,
	...rest
}: ContextualMenuProps): React.JSX.Element => (
	<CustomDropdown
		placement="right-start"
		contextMenu
		disabled={disabled}
		onOpen={onOpen}
		onClose={onClose}
		items={actions}
		disableRestoreFocus={disableRestoreFocus}
		{...rest}
	>
		{children}
	</CustomDropdown>
);
