/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
	Dropdown,
	DropdownItem,
	DropdownProps,
	useCombinedRefs
} from '@zextras/carbonio-design-system';
import styled from 'styled-components';

export interface ContextualMenuProps extends Omit<DropdownProps, 'items' | 'contextMenu'> {
	actions: DropdownItem[];
}

type ContextualMenuElement = HTMLDivElement & {
	dropdownOpen?: boolean;
};

const CustomDropdown = styled(Dropdown)`
	width: 100%;
	height: 100%;
`;

export const ContextualMenu = React.forwardRef<HTMLDivElement, ContextualMenuProps>(
	function ContextualMenuFn(
		{ children, disabled = false, onOpen, onClose, actions, disableRestoreFocus, ...rest },
		ref
	) {
		const contextMenuRef = useCombinedRefs<ContextualMenuElement>(ref);
		const [open, setOpen] = useState(false);

		useEffect(() => {
			if (contextMenuRef.current) {
				const htmlElement = contextMenuRef.current;
				htmlElement.oncontextmenu = (): void => {
					if (!htmlElement.dropdownOpen) {
						htmlElement.click();
					}
				};
			}
		}, [contextMenuRef]);

		const onOpenHandler = useCallback(() => {
			if (contextMenuRef.current) {
				contextMenuRef.current.dropdownOpen = true;
				setOpen(true);
			}
		}, [contextMenuRef]);

		const onCloseHandler = useCallback(() => {
			if (contextMenuRef.current) {
				contextMenuRef.current.dropdownOpen = false;
				setOpen(false);
			}
		}, [contextMenuRef]);

		useEffect(() => {
			// trigger onOpen and onClose with an internal state to avoid hover-bar to flash when contextual menu is
			// opened again but in a different position
			if (open) {
				onOpen && onOpen();
			} else {
				onClose && onClose();
			}
		}, [onClose, onOpen, open]);

		useEffect(() => {
			// force close when disabled
			if (disabled && contextMenuRef.current && contextMenuRef.current.dropdownOpen) {
				contextMenuRef.current.click();
			}
		}, [open, disabled, onCloseHandler, contextMenuRef]);

		return (
			<CustomDropdown
				placement="right-start"
				contextMenu
				disabled={disabled}
				onOpen={onOpenHandler}
				onClose={onCloseHandler}
				items={actions}
				ref={contextMenuRef}
				disableRestoreFocus={disableRestoreFocus}
				{...rest}
			>
				{children}
			</CustomDropdown>
		);
	}
);
