/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FetchResult, useLazyQuery } from '@apollo/client';
import styled from '@emotion/styled';
import {
	Avatar,
	Button,
	Checkbox,
	Container,
	Divider,
	Popover,
	Text,
	Tooltip
} from '@zextras/carbonio-design-system';
import { map, filter } from 'lodash';
import { useTranslation } from 'react-i18next';

import { CollaboratorPermissionIcons } from './CollaboratorPermissionIcons';
import { EditSharePopoverContainer } from './EditSharePopoverContainer';
import { SHARE_TEXT_SIZE } from '../../../../constants';
import { useDeleteSharesMutation } from '../../../../hooks/graphql/mutations/useDeleteSharesMutation';
import { useUpdateSharesMutation } from '../../../../hooks/graphql/mutations/useUpdateSharesMutation';
import { useDecreaseYourOwnSharePermissionModal } from '../../../../hooks/modals/useDecreaseYourOwnSharePermissionModal';
import { useDeleteSharesModal } from '../../../../hooks/useDeleteSharesModal';
import { Role, Node } from '../../../../types/common';
import {
	DeleteSharesMutation,
	GetPermissionsDocument,
	GetPermissionsQuery,
	GetPermissionsQueryVariables,
	Permissions,
	ShareFragment,
	SharePermission
} from '../../../../types/graphql/types';
import { MakeRequiredNonNull } from '../../../../types/utils';
import { getChipLabel, isFile, isFolder, sharePermissionsGetter } from '../../../../utils/utils';
import { RouteLeavingGuard } from '../../RouteLeavingGuard';

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

const CustomPopover = styled(Popover)`
	z-index: 1000;
`;

const StyledButton = styled(Button)`
	max-width: fit-content;
`;

interface ShareListItemProps {
	share: MakeRequiredNonNull<ShareFragment, 'share_target'> & {
		node: Node<'id'>;
	};
	permissions: Permissions;
	yourself: boolean;
	deleteShares: ReturnType<typeof useDeleteSharesMutation>;
	isSelected?: boolean;
	isSelecting?: boolean;
	onSelectionChange?: (id: string, selected: boolean) => void;
	selectionMode?: boolean;
}

export const ShareListItem = ({
	share,
	permissions,
	deleteShares,
	yourself = false,
	isSelected = false,
	isSelecting,
	onSelectionChange,
	selectionMode = false
}: ShareListItemProps): React.JSX.Element => {
	const [updateShares] = useUpdateSharesMutation();
	const [t] = useTranslation();
	const [popoverOpen, setPopoverOpen] = useState(false);

	const [getPermissionsLazy] = useLazyQuery<GetPermissionsQuery, GetPermissionsQueryVariables>(
		GetPermissionsDocument,
		{
			fetchPolicy: 'network-only',
			variables: {
				node_id: share.node.id
			}
		}
	);

	const updateShareActionCallback = useCallback(() => {
		getPermissionsLazy();
	}, [getPermissionsLazy]);

	const initialActiveRow = useMemo(() => rowSharePermissionToIdxMap[share.permission], [share]);
	const initialCheckboxValue = useMemo(
		() =>
			share.permission === SharePermission.ReadAndShare ||
			share.permission === SharePermission.ReadWriteAndShare,
		[share]
	);

	const [activeRow, setActiveRow] = useState(initialActiveRow);
	const [checkboxValue, setCheckboxValue] = useState(initialCheckboxValue);

	useEffect(() => {
		setPopoverOpen(false);
		setActiveRow(initialActiveRow);
		setCheckboxValue(initialCheckboxValue);
	}, [isSelecting, initialActiveRow, initialCheckboxValue]);

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
			updateShares(
				share.node,
				[share.share_target.id],
				sharePermissionsGetter(rowIdxToRoleMap[activeRow], checkboxValue)
			),
		[activeRow, checkboxValue, share, updateShares]
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
		(): Promise<FetchResult<DeleteSharesMutation>> =>
			deleteShares(share.node, [share.share_target.id]),
		[deleteShares, share]
	);

	const { openDeleteSharesModal } = useDeleteSharesModal(
		deleteShareCallback,
		share.share_target,
		yourself
	);

	const disabledRows = useMemo(() => {
		const filtered = filter(
			rowIdxToRoleMap,
			(role) => !roleAssignChecker[role](share.node, permissions)
		);
		return map(filtered, (value: Role) => rowRoleToIdxMap[value]);
	}, [permissions, share]);

	const label = useMemo(
		() => (yourself ? t('displayer.share.chip.you', 'You') : getChipLabel(share.share_target)),
		[yourself, t, share.share_target]
	);

	const editButtonTooltipLabel = useMemo(
		() =>
			yourself
				? t('displayer.share.chip.tooltip.edit.you', 'Edit your collaboration')
				: t('displayer.share.chip.tooltip.edit.collaborator', 'Edit collaboration'),
		[yourself, t]
	);

	const removeCollaborationButtonTooltipLabel = useMemo(
		() =>
			yourself
				? t('displayer.share.chip.tooltip.remove.yourself', 'Remove your collaboration')
				: t('displayer.share.chip.tooltip.remove.collaborator', 'Remove collaboration'),
		[t, yourself]
	);

	const openPermissionsPopover = useCallback(() => {
		if (permissions.can_share) {
			setPopoverOpen((prevState) => !prevState);
		}
	}, [permissions]);

	const isSomethingChanged = useMemo(
		() => initialActiveRow !== activeRow || initialCheckboxValue !== checkboxValue,
		[initialActiveRow, activeRow, initialCheckboxValue, checkboxValue]
	);

	const isRemoveButtonDisabled = useMemo(
		() => !(permissions.can_share || yourself) || isSelecting,
		[permissions.can_share, yourself, isSelecting]
	);

	const canShare = useMemo(() => permissions.can_share, [permissions.can_share]);

	const anchorRef = useRef<HTMLDivElement>(null);

	const collaboratorPermissionIcons = useMemo(
		() => <CollaboratorPermissionIcons permission={share.permission} />,
		[share.permission]
	);

	return (
		<>
			{isSomethingChanged && (
				<RouteLeavingGuard when={isSomethingChanged} onSave={routeLeavingGuardOnSaveHandler}>
					<Text overflow="break-word">
						{t('modal.unsaved_changes.body.line1', 'Do you want to leave the page without saving?')}
					</Text>
					<Text overflow="break-word">
						{t('modal.unsaved_changes.body.line2', 'All unsaved changes will be lost.')}
					</Text>
				</RouteLeavingGuard>
			)}
			{share.share_target.__typename === 'User' && (
				<Container
					mainAlignment={'flex-start'}
					crossAlignment={'center'}
					orientation={'horizontal'}
					padding={'0.5rem'}
					width="100%"
					background={isSelected ? 'highlight' : undefined}
				>
					<Container
						mainAlignment={'flex-start'}
						crossAlignment={'center'}
						orientation={'horizontal'}
						gap={'0.5rem'}
					>
						{selectionMode && (
							<Checkbox
								value={isSelected}
								onClick={(e): void => {
									e.stopPropagation();
									onSelectionChange?.(share.share_target.id, !isSelected);
								}}
								iconColor={isSelected ? 'primary' : undefined}
							/>
						)}
						<Avatar label={label} />
						<Container mainAlignment={'flex-start'} crossAlignment={'flex-start'}>
							<Text size={SHARE_TEXT_SIZE}>{label}</Text>
							<Text color={'secondary'} size={'extrasmall'}>
								{share.share_target.email}
							</Text>
						</Container>
					</Container>
					<Container
						orientation={'horizontal'}
						mainAlignment={'flex-start'}
						crossAlignment={'flex-start'}
						maxWidth={'fit'}
						gap={'0.25rem'}
					>
						<Tooltip
							label={
								canShare
									? editButtonTooltipLabel
									: t(
											'displayer.share.tooltip.no_edit_permission',
											"You don't have the necessary permissions to edit collaboration"
										)
							}
							disabled={isSelecting}
						>
							<Container
								mainAlignment={'flex-start'}
								crossAlignment={'flex-start'}
								orientation={'horizontal'}
								width={'fit'}
							>
								<StyledButton
									ref={anchorRef}
									icon={() => collaboratorPermissionIcons}
									type={'outlined'}
									onClick={openPermissionsPopover}
									disabled={!canShare || isSelecting}
								/>
							</Container>
						</Tooltip>
						<CustomPopover
							open={popoverOpen}
							anchorEl={anchorRef}
							styleAsModal
							placement="bottom-end"
							onClose={() => setPopoverOpen(false)}
						>
							<EditSharePopoverContainer
								activeRow={activeRow}
								disabledRows={disabledRows}
								checkboxValue={checkboxValue}
								checkboxOnClick={switchSharingAllowed}
								containerOnClick={changeRole}
								saveDisabled={
									initialActiveRow === activeRow && initialCheckboxValue === checkboxValue
								}
								saveOnClick={
									yourself && decreasingSharePermissions
										? openDecreaseYourOwnSharePermissionModal
										: updateShareCallback
								}
								closePopover={() => setPopoverOpen(false)}
							/>
						</CustomPopover>
						<Tooltip
							label={
								isRemoveButtonDisabled
									? t(
											'displayer.share.tooltip.no_remove_permission',
											"You don't have the necessary permissions to remove collaboration"
										)
									: removeCollaborationButtonTooltipLabel
							}
							disabled={isSelecting}
						>
							<Button
								icon={'Trash2Outline'}
								color={'error'}
								type={'outlined'}
								onClick={openDeleteSharesModal}
								disabled={isRemoveButtonDisabled}
							/>
						</Tooltip>
					</Container>
				</Container>
			)}
			<Divider color={'gray3'} />
		</>
	);
};
