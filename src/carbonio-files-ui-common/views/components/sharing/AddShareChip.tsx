/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable arrow-body-style */
import React, { useCallback, useMemo, useState } from 'react';

import { ChipAction } from '@zextras/carbonio-design-system';
import { filter, toLower } from 'lodash';
import { useTranslation } from 'react-i18next';

import { useActiveNode } from '../../../../hooks/useActiveNode';
import { SHARE_CHIP_MAX_WIDTH } from '../../../constants';
import { useGetNodeQuery } from '../../../hooks/graphql/queries/useGetNodeQuery';
import { Role, ShareChip } from '../../../types/common';
import { Node } from '../../../types/graphql/types';
import { getChipLabel, isFile, isFolder } from '../../../utils/utils';
import { ChipWithPopover } from './ChipWithPopover';
import { NewShareChipPopoverContainer } from './NewShareChipPopoverContainer';
import { ShareChipLabel } from './ShareChipLabel';

const rowRoleToIdxMap: { [key in Role]: number } = {
	[Role.Viewer]: 0,
	[Role.Editor]: 1
};

const roleAssignChecker: {
	[key in Role]: (node: Pick<Node, 'type' | 'permissions'>) => boolean;
} = {
	[Role.Editor]: (node: Pick<Node, 'type' | 'permissions'>): boolean =>
		(toLower(node.type) === 'folder' && node.permissions.can_write_folder) ||
		(!(toLower(node.type) === 'folder') && node.permissions.can_write_file),
	[Role.Viewer]: (): boolean => true
};

const rowIdxToRoleMap: { [key: number]: Role } = {
	0: Role.Viewer,
	1: Role.Editor
};

export const AddShareChip = React.forwardRef<HTMLDivElement, Omit<ShareChip, 'label'>>(
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
		const [t] = useTranslation();
		const [popoverOpen, setPopoverOpen] = useState(false);
		const error = useMemo(() => value.id === undefined, [value.id]);

		const switchSharingAllowed = (): void => {
			value.onUpdate(value.id, { sharingAllowed: !value.sharingAllowed });
		};

		const { activeNodeId } = useActiveNode();
		const { data: nodeData } = useGetNodeQuery(activeNodeId, undefined, {
			fetchPolicy: 'cache-only'
		});
		const node = useMemo(() => nodeData?.getNode || null, [nodeData]);

		const changeRole = (containerIdx: keyof typeof rowIdxToRoleMap): void => {
			const desiredRole = rowIdxToRoleMap[containerIdx];
			if (
				desiredRole !== Role.Editor ||
				// if desiredRole === Role.Editor you need write permission
				(node &&
					((isFolder(node) && node.permissions.can_write_folder) ||
						(isFile(node) && node.permissions.can_write_file)))
			) {
				value.onUpdate(value.id, { role: rowIdxToRoleMap[containerIdx] });
			}
		};

		const disabledRows = useMemo(() => {
			return filter(rowRoleToIdxMap, (idx, role) => {
				return !node || !roleAssignChecker[role as Role](node);
			});
		}, [node]);

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
			if (!error) {
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
		}, [
			editShareTooltip,
			error,
			onClose,
			openPermissionsPopover,
			removeShareTooltip,
			value.role,
			value.sharingAllowed
		]);

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
				label={<ShareChipLabel contact={value} showTooltip={value.id !== undefined} />}
				background={(value.id !== undefined && 'gray2') || undefined}
				error={
					error &&
					t(
						'share.chip.tooltip.error.contactNotFound',
						'This email address is not associated to a Carbonio user'
					)
				}
				ref={ref}
			>
				{(_closePopover: () => void): JSX.Element => (
					<NewShareChipPopoverContainer
						activeRow={rowRoleToIdxMap[value.role]}
						disabledRows={disabledRows}
						checkboxValue={value.sharingAllowed}
						checkboxOnClick={switchSharingAllowed}
						containerOnClick={changeRole}
					/>
				)}
			</ChipWithPopover>
		);
	}
);
