/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useState } from 'react';

import { Button, Popover, useCombinedRefs } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { Role } from '../../../types/common';

const CustomPopover = styled(Popover)`
	z-index: 1000;
`;

const StyledButton = styled(Button)`
	flex-shrink: 0;
	min-width: max-content;
`;

export interface ButtonWithPopoverProps {
	onClose?: (event?: React.SyntheticEvent | KeyboardEvent) => void;
	popoverOpen?: boolean;
	onClick?: (event: React.SyntheticEvent) => void;
	children: (closePopover: () => void) => React.JSX.Element;
	onValueChange?: (newState: boolean) => void;
	openPermissionPopover: () => void;
	permissionDefined: Role;
	isAllowedSharingChecked: boolean;
}

export const ButtonWithPopover = React.forwardRef<HTMLDivElement, ButtonWithPopoverProps>(
	function ButtonWithPopoverFn(
		{
			popoverOpen = false,
			children,
			onValueChange,
			openPermissionPopover,
			permissionDefined,
			isAllowedSharingChecked
		},
		ref
	) {
		const [t] = useTranslation();
		const innerRef = useCombinedRefs<HTMLDivElement>(ref);
		const [open, setOpen] = useState(popoverOpen);

		useEffect(() => {
			setOpen(popoverOpen);
		}, [popoverOpen]);

		const setOpenToFalse = useCallback(() => {
			if (onValueChange) {
				onValueChange(false);
			} else {
				setOpen(false);
			}
		}, [onValueChange]);

		return (
			<>
				<StyledButton
					ref={innerRef}
					label={permissionDefined === Role.Viewer ? t('', 'Viewer') : t('', 'Editor')}
					icon={isAllowedSharingChecked ? 'Share' : 'ShareOff'}
					onClick={openPermissionPopover}
					secondaryAction={{
						icon: 'ChevronDown',
						onClick: openPermissionPopover
					}}
					type={'outlined'}
				/>
				<CustomPopover
					open={open}
					anchorEl={innerRef}
					styleAsModal
					placement="bottom-end"
					onClose={setOpenToFalse}
				>
					{children(setOpenToFalse)}
				</CustomPopover>
			</>
		);
	}
);
