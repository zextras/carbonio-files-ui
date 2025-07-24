/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';

import {
	Popover,
	useCombinedRefs,
	Button,
	Tooltip,
	Container
} from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { CollaboratorPermissionIcons } from './CollaboratorPermissionIcons';
import { SharePermission } from '../../../../types/graphql/types';

const CustomPopover = styled(Popover)`
	z-index: 1000;
`;

const StyledButton = styled(Button)`
	max-width: fit-content;
`;

export interface EditButtonWithPopoverProps {
	popoverOpen?: boolean;
	children: (closePopover: () => void) => React.JSX.Element;
	onValueChange?: (newState: boolean) => void;
	canShare?: boolean;
	editButtonTooltipLabel?: string;
	openPermissionsPopover: () => void;
	permission: SharePermission;
}

export const EditButtonWithPopover = React.forwardRef<HTMLDivElement, EditButtonWithPopoverProps>(
	function EditButtonWithPopoverFn(
		{
			popoverOpen = false,
			children,
			onValueChange,
			canShare,
			editButtonTooltipLabel,
			openPermissionsPopover,
			permission
		},
		ref
	) {
		const innerRef = useCombinedRefs<HTMLDivElement>(ref);
		const [t] = useTranslation();
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

		const permissionIcon = useMemo(() => {
			if (permission === SharePermission.ReadOnly || permission === SharePermission.ReadAndShare)
				return 'EyeOutline';
			if (
				permission === SharePermission.ReadAndWrite ||
				permission === SharePermission.ReadWriteAndShare
			)
				return 'Edit2Outline';
			return 'EyeOutline';
		}, [permission]);

		return (
			<>
				<Tooltip
					label={
						canShare
							? editButtonTooltipLabel
							: t(
									'displayer.share.tooltip.no_edit_permission',
									"You don't have the necessary permissions to edit collaboration"
								)
					}
				>
					<Container
						mainAlignment={'flex-start'}
						crossAlignment={'flex-start'}
						orientation={'horizontal'}
						width={'fit'}
					>
						<StyledButton
							ref={innerRef}
							icon={() => (
								<CollaboratorPermissionIcons
									permissionIcon={permissionIcon}
									permission={permission}
								/>
							)}
							type={'outlined'}
							onClick={openPermissionsPopover}
							disabled={!canShare}
						/>
					</Container>
				</Tooltip>
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
