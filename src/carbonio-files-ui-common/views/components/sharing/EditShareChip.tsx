/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useState } from 'react';

import { FetchResult, useLazyQuery } from '@apollo/client';
import { ChipAction, Text, useSnackbar } from '@zextras/carbonio-design-system';
import { map, filter } from 'lodash';
import { useTranslation } from 'react-i18next';

import { ChipWithPopover } from './ChipWithPopover';
import { EditShareChipPopoverContainer } from './EditShareChipPopoverContainer';
import { ShareChipLabel } from './ShareChipLabel';
import { SHARE_CHIP_MAX_WIDTH, SHARE_CHIP_SIZE } from '../../../constants';
import { useDeleteShareMutation } from '../../../hooks/graphql/mutations/useDeleteShareMutation';
import { useUpdateShareMutation } from '../../../hooks/graphql/mutations/useUpdateShareMutation';
import { useDecreaseYourOwnSharePermissionModal } from '../../../hooks/modals/useDecreaseYourOwnSharePermissionModal';
import { useDeleteShareModal } from '../../../hooks/useDeleteShareModal';
import { Role, Node } from '../../../types/common';
import {
	DeleteShareMutation,
	GetPermissionsDocument,
	GetPermissionsQuery,
	GetPermissionsQueryVariables,
	Permissions,
	ShareFragment,
	SharePermission
} from '../../../types/graphql/types';
import { MakeRequiredNonNull } from '../../../types/utils';
import { getChipLabel, isFile, isFolder, sharePermissionsGetter } from '../../../utils/utils';
import { RouteLeavingGuard } from '../RouteLeavingGuard';

const rowSharePermissionToIdxMap = {
	[SharePermission.ReadOnly]: 0,
	[SharePermission.ReadAndShare]: 0,
	[SharePermission.ReadAndWrite]: 1,
	[SharePermission.ReadWriteAndShare]: 1
};

const rowRoleToIdxMap: { [Role.Editor]: number; [Role.Viewer]: number } = {
	[Role.Viewer]: 0,
	[Role.Editor]: 1
};

const roleAssignChecker: {
	[Role.Editor]: (node: Pick<Node, '__typename'>, permissions: Permissions) => boolean;
	[Role.Viewer]: (node: Pick<Node, '__typename'>, permissions: Permissions) => boolean;
} = {
	[Role.Editor]: (node: Pick<Node, '__typename'>, permissions: Permissions) =>
		(isFolder(node) && permissions.can_write_folder) ||
		(isFile(node) && permissions.can_write_file),
	[Role.Viewer]: () => true
};

const rowIdxToRoleMap: { [id: number]: Role } = {
	0: Role.Viewer,
	1: Role.Editor
};

interface EditShareChipProps {
	share: MakeRequiredNonNull<ShareFragment, 'share_target'> & {
		node: Node<'id'>;
	};
	permissions: Permissions;
	yourselfChip: boolean;
	deleteShare: ReturnType<typeof useDeleteShareMutation>;
}

export const EditShareChip = ({
	share,
	permissions,
	deleteShare,
	yourselfChip = false
}: EditShareChipProps): React.JSX.Element => {
	const [updateShare] = useUpdateShareMutation();
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();
	const [popoverOpen, setPopoverOpen] = useState(false);

	const [getPermissionsLazy] = useLazyQuery<GetPermissionsQuery, GetPermissionsQueryVariables>(
		GetPermissionsDocument,
		{
			fetchPolicy: 'network-only',
			variables: {
				node_id: share?.node?.id
			}
		}
	);

	const updateShareActionCallback = useCallback(() => {
		getPermissionsLazy();
		createSnackbar({
			key: new Date().toLocaleString(),
			severity: 'info',
			label: t('snackbar.decreaseYourOwnShare.success', 'Rights updated successfully'),
			replace: true,
			hideButton: true
		});
	}, [createSnackbar, getPermissionsLazy, t]);

	const initialActiveRow = useMemo(() => rowSharePermissionToIdxMap[share.permission], [share]);
	const initialCheckboxValue = useMemo(
		() =>
			share.permission === SharePermission.ReadAndShare ||
			share.permission === SharePermission.ReadWriteAndShare,
		[share]
	);

	const [activeRow, setActiveRow] = useState(initialActiveRow);
	const [checkboxValue, setCheckboxValue] = useState(initialCheckboxValue);

	const decreasingSharePermissions = useMemo(
		() =>
			(initialCheckboxValue && !checkboxValue) ||
			(rowIdxToRoleMap[initialActiveRow] === Role.Editor &&
				rowIdxToRoleMap[activeRow] === Role.Viewer),
		[activeRow, checkboxValue, initialActiveRow, initialCheckboxValue]
	);

	const switchSharingAllowed = (): void => {
		setCheckboxValue((prevState) => !prevState);
	};

	const changeRole = (containerIdx: number): void => {
		const desiredRole: Role = rowIdxToRoleMap[containerIdx];
		if (
			desiredRole !== Role.Editor ||
			// if desiredRole === Role.Editor you need write permission
			(isFolder(share.node) && permissions.can_write_folder) ||
			(isFile(share.node) && permissions.can_write_file)
		) {
			setActiveRow(containerIdx);
		}
	};

	const updateShareCallback = useCallback(
		() =>
			updateShare(
				share.node,
				share.share_target.id,
				sharePermissionsGetter(rowIdxToRoleMap[activeRow], checkboxValue)
			),
		[activeRow, checkboxValue, share, updateShare]
	);

	const routeLeavingGuardOnSaveHandler = useCallback(
		(): ReturnType<typeof Promise.allSettled> => Promise.allSettled([updateShareCallback()]),
		[updateShareCallback]
	);

	const { openDecreaseYourOwnSharePermissionModal } = useDecreaseYourOwnSharePermissionModal(
		updateShareCallback,
		updateShareActionCallback
	);

	const deleteShareCallback = useCallback(
		(): Promise<FetchResult<DeleteShareMutation>> => deleteShare(share.node, share.share_target.id),
		[deleteShare, share]
	);

	const { openDeleteShareModal } = useDeleteShareModal(
		deleteShareCallback,
		share.share_target,
		yourselfChip
	);

	const openDeleteShareModalCallback = useCallback(() => {
		openDeleteShareModal();
	}, [openDeleteShareModal]);

	const disabledRows = useMemo(() => {
		const filtered = filter(
			rowIdxToRoleMap,
			(role) => !roleAssignChecker[role](share.node, permissions)
		);
		return map(filtered, (value: Role) => rowRoleToIdxMap[value]);
	}, [permissions, share]);

	const chipLabel = useMemo(
		() => (yourselfChip ? t('displayer.share.chip.you', 'You') : getChipLabel(share.share_target)),
		[yourselfChip, t, share.share_target]
	);

	const editChipTooltipLabel = useMemo(
		() =>
			yourselfChip
				? t('displayer.share.chip.tooltip.edit.you', 'Edit your collaboration')
				: t('displayer.share.chip.tooltip.edit.collaborator', "Edit {{username}}'s collaboration", {
						replace: { username: getChipLabel(share.share_target) }
					}),
		[yourselfChip, share.share_target, t]
	);

	const openPermissionsPopover = useCallback(() => {
		if (permissions.can_share) {
			setPopoverOpen((prevState) => !prevState);
		}
	}, [permissions]);

	const updatePermissionsPopover = useCallback((newState: boolean) => {
		setPopoverOpen(newState);
	}, []);

	const actions = useMemo<ChipAction[]>(() => {
		const icons: ChipAction[] = [];
		if (
			share.permission === SharePermission.ReadOnly ||
			share.permission === SharePermission.ReadAndShare
		) {
			icons.push({
				icon: 'EyeOutline',
				id: 'EyeOutline',
				type: permissions.can_share ? 'button' : 'icon',
				color: 'gray0',
				label: (permissions.can_share && editChipTooltipLabel) || undefined,
				onClick: openPermissionsPopover
			});
		} else if (
			share.permission === SharePermission.ReadAndWrite ||
			share.permission === SharePermission.ReadWriteAndShare
		) {
			icons.push({
				icon: 'Edit2Outline',
				id: 'Edit2Outline',
				type: permissions.can_share ? 'button' : 'icon',
				color: 'gray0',
				label: (permissions.can_share && editChipTooltipLabel) || undefined,
				onClick: openPermissionsPopover
			});
		}
		if (
			share.permission === SharePermission.ReadAndShare ||
			share.permission === SharePermission.ReadWriteAndShare
		) {
			icons.push({
				icon: 'Share',
				id: 'Share',
				type: permissions.can_share ? 'button' : 'icon',
				color: 'gray0',
				label: (permissions.can_share && editChipTooltipLabel) || undefined,
				onClick: openPermissionsPopover
			});
		}

		const buttons: ChipAction[] = [];
		if (permissions.can_share || yourselfChip) {
			buttons.push({
				icon: 'Close',
				label: yourselfChip
					? t('displayer.share.chip.tooltip.remove.yourself', 'Remove your collaboration')
					: t('displayer.share.chip.tooltip.remove.collaborator', 'Remove {{username}}', {
							replace: { username: getChipLabel(share.share_target) }
						}),
				id: 'Remove',
				type: 'button',
				color: 'gray0',
				onClick: openDeleteShareModalCallback
			});
		}
		return [...icons, ...buttons];
	}, [
		editChipTooltipLabel,
		openDeleteShareModalCallback,
		openPermissionsPopover,
		permissions.can_share,
		share,
		t,
		yourselfChip
	]);

	const chipLabelComponent = useMemo(
		() => <ShareChipLabel contact={share.share_target} />,
		[share.share_target]
	);

	return (
		<>
			<RouteLeavingGuard
				when={initialActiveRow !== activeRow || initialCheckboxValue !== checkboxValue}
				onSave={routeLeavingGuardOnSaveHandler}
			>
				<Text overflow="break-word">
					{t('modal.unsaved_changes.body.line1', 'Do you want to leave the page without saving?')}
				</Text>
				<Text overflow="break-word">
					{t('modal.unsaved_changes.body.line2', 'All unsaved changes will be lost.')}
				</Text>
			</RouteLeavingGuard>
			<ChipWithPopover
				size={SHARE_CHIP_SIZE}
				avatarLabel={chipLabel}
				label={chipLabelComponent}
				background={'gray3'}
				actions={actions}
				openPopoverOnClick={false}
				popoverOpen={popoverOpen}
				onValueChange={updatePermissionsPopover}
				maxWidth={SHARE_CHIP_MAX_WIDTH}
			>
				{(closePopover: () => void): React.JSX.Element => (
					<EditShareChipPopoverContainer
						activeRow={activeRow}
						disabledRows={disabledRows}
						checkboxValue={checkboxValue}
						checkboxOnClick={switchSharingAllowed}
						containerOnClick={changeRole}
						saveDisabled={initialActiveRow === activeRow && initialCheckboxValue === checkboxValue}
						saveOnClick={
							yourselfChip && decreasingSharePermissions
								? openDecreaseYourOwnSharePermissionModal
								: updateShareCallback
						}
						closePopover={closePopover}
					/>
				)}
			</ChipWithPopover>
		</>
	);
};
