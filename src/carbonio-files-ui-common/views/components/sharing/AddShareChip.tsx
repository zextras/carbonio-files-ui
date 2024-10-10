/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useState } from 'react';

import { ChipAction, ChipInputProps } from '@zextras/carbonio-design-system';
import { filter } from 'lodash';
import { useTranslation } from 'react-i18next';

import { ChipWithPopover } from './ChipWithPopover';
import { NewShareChipPopoverContainer } from './NewShareChipPopoverContainer';
import { ShareChipLabel } from './ShareChipLabel';
import { SHARE_CHIP_MAX_WIDTH } from '../../../constants';
import { Node, Role, ShareChip } from '../../../types/common';
import { getChipLabel, isFile, isFolder } from '../../../utils/utils';

const rowRoleToIdxMap: { [key in Role]: number } = {
	[Role.Viewer]: 0,
	[Role.Editor]: 1
};

const roleAssignChecker: {
	[key in Role]: (node: Node<'permissions'>) => boolean;
} = {
	[Role.Editor]: (node: Node<'permissions'>): boolean =>
		(isFolder(node) && node.permissions.can_write_folder) ||
		(isFile(node) && node.permissions.can_write_file),
	[Role.Viewer]: (): boolean => true
};

const rowIdxToRoleMap: { [key: number]: Role } = {
	0: Role.Viewer,
	1: Role.Editor
};

type AddShareChipProps = React.ComponentPropsWithoutRef<
	NonNullable<ChipInputProps<ShareChip['value']>['ChipComponent']>
>;

export const AddShareChip = React.forwardRef<HTMLDivElement, AddShareChipProps>(
	function AddShareChipFn(
		{
			/** Chip value */
			value,
			onClose,
			/** Accept all Chip props */
			...rest
		},
		ref
	) {
		const node = value?.node;
		const [t] = useTranslation();
		const [popoverOpen, setPopoverOpen] = useState(false);
		const error = useMemo(() => value?.id === undefined, [value?.id]);

		const switchSharingAllowed = useCallback((): void => {
			value?.onUpdate(value.id, { sharingAllowed: !value.sharingAllowed });
		}, [value]);

		const changeRole = useCallback(
			(containerIdx: keyof typeof rowIdxToRoleMap): void => {
				const desiredRole = rowIdxToRoleMap[containerIdx];
				if (node && roleAssignChecker[desiredRole](node)) {
					value?.onUpdate(value.id, { role: rowIdxToRoleMap[containerIdx] });
				}
			},
			[node, value]
		);

		const disabledRows = useMemo(
			() =>
				filter(rowRoleToIdxMap, (_idx, role) => !node || !roleAssignChecker[role as Role](node)),
			[node]
		);

		const openPermissionsPopover = useCallback(() => {
			setPopoverOpen((prevState) => !prevState);
		}, []);

		const [editShareTooltip, removeShareTooltip] = useMemo(
			() => [
				t('displayer.share.chip.tooltip.edit.collaborator', "Edit {{username}}'s collaboration", {
					replace: { username: getChipLabel(value) }
				}),
				t('displayer.share.chip.tooltip.remove.collaborator', 'Remove {{username}}', {
					replace: { username: getChipLabel(value) }
				})
			],
			[t, value]
		);

		const actions = useMemo<ChipAction[]>(() => {
			const icons: Array<ChipAction> = [];
			if (!error && value) {
				if (value.role === Role.Viewer) {
					icons.push({
						icon: 'EyeOutline',
						id: 'EyeOutline',
						type: 'button',
						color: 'gray0',
						label: editShareTooltip,
						onClick: openPermissionsPopover
					});
				} else {
					icons.push({
						icon: 'Edit2Outline',
						id: 'Edit2Outline',
						type: 'button',
						color: 'gray0',
						label: editShareTooltip,
						onClick: openPermissionsPopover
					});
				}
				if (value.sharingAllowed) {
					icons.push({
						icon: 'Share',
						id: 'Share',
						type: 'button',
						color: 'gray0',
						label: editShareTooltip,
						onClick: openPermissionsPopover
					});
				}
			}
			if (onClose) {
				icons.push({
					icon: 'Close',
					id: 'Remove',
					type: 'button',
					color: 'gray0',
					label: removeShareTooltip,
					onClick: onClose
				});
			}
			return icons;
		}, [editShareTooltip, error, onClose, openPermissionsPopover, removeShareTooltip, value]);

		const updatePermissionsPopover = useCallback((newState: boolean) => {
			setPopoverOpen(newState);
		}, []);

		return (
			<ChipWithPopover
				maxWidth={SHARE_CHIP_MAX_WIDTH}
				actions={actions}
				popoverOpen={popoverOpen}
				openPopoverOnClick={false}
				onValueChange={updatePermissionsPopover}
				{...rest}
				avatarLabel={getChipLabel(value)}
				label={<ShareChipLabel contact={value} showTooltip={value?.id !== undefined} />}
				background={(value?.id !== undefined && 'gray2') || undefined}
				error={
					error &&
					t(
						'share.chip.tooltip.error.contactNotFound',
						'This email address is not associated to a Carbonio user'
					)
				}
				ref={ref}
			>
				{(): React.JSX.Element => (
					<NewShareChipPopoverContainer
						activeRow={rowRoleToIdxMap[value?.role ?? Role.Viewer]}
						disabledRows={disabledRows}
						checkboxValue={!!value?.sharingAllowed}
						checkboxOnClick={switchSharingAllowed}
						containerOnClick={changeRole}
					/>
				)}
			</ChipWithPopover>
		);
	}
);
