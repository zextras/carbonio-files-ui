/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useLazyQuery } from '@apollo/client';
import styled from '@emotion/styled';
import { Button, Popover, Row, Tooltip } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { EditSharePopoverContainer } from './EditSharePopoverContainer';
import { useUpdateSharesMutation } from '../../../../hooks/graphql/mutations/useUpdateSharesMutation';
import { useDecreaseYourOwnSharePermissionModal } from '../../../../hooks/modals/useDecreaseYourOwnSharePermissionModal';
import { Node, Role } from '../../../../types/common';
import {
	GetPermissionsDocument,
	GetPermissionsQuery,
	GetPermissionsQueryVariables,
	GetSharesQuery,
	Maybe,
	Share,
	SharePermission
} from '../../../../types/graphql/types';
import { DeepPick } from '../../../../types/utils';
import { isFile, isFolder, sharePermissionsGetter } from '../../../../utils/utils';

const CustomPopover = styled(Popover)`
	z-index: 1000;
`;

interface EditPermissionBulkButtonProps {
	node: Node<'id' | 'permissions' | 'owner' | 'name'> & {
		shares: Array<
			Maybe<Pick<Share, '__typename'> & DeepPick<Share, 'share_target', '__typename' | 'id'>>
		> | null;
	};
	data?: GetSharesQuery;
	me: string;
	isAllSelected: boolean;
	allCollaboratorIds: string[];
	selectedIds: string[];
	setSelectedIds: (ids: string[]) => void;
}

export const EditPermissionBulkButton = ({
	node,
	data,
	me,
	isAllSelected,
	allCollaboratorIds,
	selectedIds,
	setSelectedIds
}: EditPermissionBulkButtonProps): React.JSX.Element => {
	const [bulkEditPopoverOpen, setBulkEditPopoverOpen] = useState(false);
	const [bulkEditActiveRow, setBulkEditActiveRow] = useState(0);
	const [bulkEditCheckboxValue, setBulkEditCheckboxValue] = useState(false);
	const bulkEditAnchorRef = useRef<HTMLDivElement>(null);
	const [t] = useTranslation();
	const [updateShares] = useUpdateSharesMutation();
	const [getPermissionsLazy] = useLazyQuery<GetPermissionsQuery, GetPermissionsQueryVariables>(
		GetPermissionsDocument,
		{
			fetchPolicy: 'network-only',
			variables: {
				node_id: node.id
			}
		}
	);

	const bulkEditDisabledRows = useMemo(() => {
		const canWriteEditor =
			(isFolder(node) && node.permissions.can_write_folder) ||
			(isFile(node) && node.permissions.can_write_file);
		return canWriteEditor ? [] : [1];
	}, [node]);

	const toggleBulkEditPopover = useCallback(() => {
		setBulkEditPopoverOpen((prev) => !prev);
	}, []);

	const handleBulkEditChangeRole = useCallback(
		(containerIdx: number) => {
			if (!bulkEditDisabledRows.includes(containerIdx)) {
				setBulkEditActiveRow(containerIdx);
			}
		},
		[bulkEditDisabledRows]
	);

	const handleBulkEditToggleCheckbox = useCallback(() => {
		setBulkEditCheckboxValue((prev) => !prev);
	}, []);

	const mySharePermission = useMemo(() => {
		const myShare = data?.getNode?.shares?.find(
			(share) => share && share.share_target && share.share_target.id === me
		);
		return myShare?.permission ?? null;
	}, [data?.getNode?.shares, me]);

	const bulkUpdateShareAction = useCallback(() => {
		const ids = isAllSelected ? allCollaboratorIds : selectedIds;
		const rowIdxToRole: { [id: number]: Role } = {
			0: Role.Viewer,
			1: Role.Editor
		};
		const permission = sharePermissionsGetter(
			rowIdxToRole[bulkEditActiveRow],
			bulkEditCheckboxValue
		);
		return updateShares(node, ids, permission);
	}, [
		allCollaboratorIds,
		bulkEditActiveRow,
		bulkEditCheckboxValue,
		isAllSelected,
		node,
		selectedIds,
		updateShares
	]);

	const updateSharesActionCallback = useCallback(() => {
		getPermissionsLazy();
		setSelectedIds([]);
		setBulkEditActiveRow(0);
		setBulkEditCheckboxValue(false);
	}, [getPermissionsLazy, setSelectedIds]);

	const { openDecreaseYourOwnSharePermissionModal } = useDecreaseYourOwnSharePermissionModal(
		bulkUpdateShareAction,
		updateSharesActionCallback
	);

	const isBulkEditDecreasingOwnPermission = useMemo(() => {
		const ids = isAllSelected ? allCollaboratorIds : selectedIds;
		if (!ids.includes(me) || mySharePermission === null) {
			return false;
		}
		const rowIdxToRole: { [id: number]: Role } = {
			0: Role.Viewer,
			1: Role.Editor
		};
		const newPermission = sharePermissionsGetter(
			rowIdxToRole[bulkEditActiveRow],
			bulkEditCheckboxValue
		);
		// Define permission rank to detect decrease
		const permissionRank: Record<SharePermission, number> = {
			[SharePermission.ReadOnly]: 0,
			[SharePermission.ReadAndShare]: 1,
			[SharePermission.ReadAndWrite]: 2,
			[SharePermission.ReadWriteAndShare]: 3
		};
		return permissionRank[newPermission] < permissionRank[mySharePermission];
	}, [
		allCollaboratorIds,
		bulkEditActiveRow,
		bulkEditCheckboxValue,
		isAllSelected,
		me,
		mySharePermission,
		selectedIds
	]);

	const handleBulkEditSave = useCallback(() => {
		if (isBulkEditDecreasingOwnPermission) {
			openDecreaseYourOwnSharePermissionModal();
		} else {
			bulkUpdateShareAction();
			updateSharesActionCallback();
		}
	}, [
		bulkUpdateShareAction,
		isBulkEditDecreasingOwnPermission,
		openDecreaseYourOwnSharePermissionModal,
		updateSharesActionCallback
	]);

	return (
		<Tooltip
			label={t('displayer.share.chip.tooltip.edit.bulk', 'Edit collaboration for all')}
			placement="top"
		>
			<Row>
				<Button
					ref={bulkEditAnchorRef}
					icon={'EyeOutline'}
					type={'outlined'}
					onClick={toggleBulkEditPopover}
				/>
				<CustomPopover
					open={bulkEditPopoverOpen}
					anchorEl={bulkEditAnchorRef}
					styleAsModal
					placement="bottom-end"
					onClose={() => setBulkEditPopoverOpen(false)}
				>
					<EditSharePopoverContainer
						activeRow={bulkEditActiveRow}
						disabledRows={bulkEditDisabledRows}
						checkboxValue={bulkEditCheckboxValue}
						checkboxOnClick={handleBulkEditToggleCheckbox}
						containerOnClick={handleBulkEditChangeRole}
						saveDisabled={false}
						saveOnClick={handleBulkEditSave}
						closePopover={() => setBulkEditPopoverOpen(false)}
					/>
				</CustomPopover>
			</Row>
		</Tooltip>
	);
};
