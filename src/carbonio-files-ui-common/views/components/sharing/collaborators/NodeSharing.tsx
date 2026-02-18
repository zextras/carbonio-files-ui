/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useLazyQuery } from '@apollo/client';
import styled from '@emotion/styled';
import {
	Avatar,
	Button,
	Checkbox,
	Container,
	Divider,
	Icon,
	Padding,
	Popover,
	Row,
	Text,
	Tooltip,
	useModal
} from '@zextras/carbonio-design-system';
import { reduce } from 'lodash';
import { useTranslation } from 'react-i18next';

import { AddSharing } from './AddSharing';
import { EditSharePopoverContainer } from './EditSharePopoverContainer';
import { ShareListItem } from './ShareListItem';
import { useUserInfo } from '../../../../../hooks/useUserInfo';
import { SHARE_TEXT_SIZE } from '../../../../constants';
import { useDeleteShareMutation } from '../../../../hooks/graphql/mutations/useDeleteShareMutation';
import { useUpdateShareMutation } from '../../../../hooks/graphql/mutations/useUpdateShareMutation';
import { useGetSharesQuery } from '../../../../hooks/graphql/queries/useGetSharesQuery';
import {
	useDecreaseYourOwnSharePermissionModal,
	type UpdateShareAction
} from '../../../../hooks/modals/useDecreaseYourOwnSharePermissionModal';
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
import { DeepPick, MakePartial, MakeRequiredNonNull } from '../../../../types/utils';
import {
	cssCalcBuilder,
	getChipLabel,
	isFile,
	isFolder,
	sharePermissionsGetter
} from '../../../../utils/utils';
import { CollaborationLinks } from '../collaborationLinks/CollaborationLinks';
import { PublicLink } from '../publicLink/PublicLink';

const MainContainer = styled(Container)`
	gap: ${({ theme }): string => theme.sizes.padding.medium};
	overflow-y: auto;
`;

const ScrollContainer = styled(Container)`
	overflow-y: auto;
	overflow-x: hidden;

	> div {
		margin: ${({ theme }): string => {
			const $marginSize = cssCalcBuilder(theme.sizes.padding.extrasmall, ['/', 2]);
			return `${$marginSize} ${$marginSize} ${$marginSize} 0`;
		}};
	}
`;

const CustomPopover = styled(Popover)`
	z-index: 1000;
`;

interface NodeSharingProps {
	node: Node<'id' | 'permissions' | 'owner' | 'name'> & {
		shares: Array<
			Maybe<Pick<Share, '__typename'> & DeepPick<Share, 'share_target', '__typename' | 'id'>>
		> | null;
	};
}

function shareTargetExists<T extends MakePartial<Pick<Share, 'share_target'>, 'share_target'>>(
	share: T
): share is T & MakeRequiredNonNull<T, 'share_target'> {
	return share.share_target !== undefined && share.share_target !== null;
}

export const NodeSharing = ({ node }: NodeSharingProps): React.JSX.Element => {
	const [t] = useTranslation();
	const { me } = useUserInfo();
	const { createModal, closeModal } = useModal();

	const { data } = useGetSharesQuery(node.id);

	const deleteShare = useDeleteShareMutation();
	const [updateShare] = useUpdateShareMutation();

	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [bulkEditPopoverOpen, setBulkEditPopoverOpen] = useState(false);
	const [bulkEditActiveRow, setBulkEditActiveRow] = useState(0);
	const [bulkEditCheckboxValue, setBulkEditCheckboxValue] = useState(false);
	const bulkEditAnchorRef = useRef<HTMLDivElement>(null);

	const [getPermissionsLazy] = useLazyQuery<GetPermissionsQuery, GetPermissionsQueryVariables>(
		GetPermissionsDocument,
		{
			fetchPolicy: 'network-only',
			variables: {
				node_id: node.id
			}
		}
	);

	const allCollaboratorIds = useMemo(() => {
		const ids: string[] = [];
		data?.getNode?.shares?.forEach((share) => {
			if (share && share.share_target && share.share_target.__typename === 'User') {
				ids.push(share.share_target.id);
			}
		});
		return ids;
	}, [data?.getNode?.shares]);

	const handleSelectionChange = useCallback((id: string, selected: boolean) => {
		setSelectedIds((prev) => {
			if (selected) {
				return prev.includes(id) ? prev : [...prev, id];
			}
			return prev.filter((existingId) => existingId !== id);
		});
	}, []);

	const handleSelectAll = useCallback(() => {
		if (selectedIds.length === allCollaboratorIds.length) {
			setSelectedIds([]);
		} else {
			setSelectedIds([...allCollaboratorIds]);
		}
	}, [allCollaboratorIds, selectedIds.length]);

	const selectionMode = node.permissions.can_share;

	const isAllSelected =
		allCollaboratorIds.length > 0 && selectedIds.length === allCollaboratorIds.length;

	const handleBulkDelete = useCallback(() => {
		if (isAllSelected) {
			const modalId = 'delete-modal';
			createModal({
				id: modalId,
				title: (
					<Container
						orientation="horizontal"
						mainAlignment={'flex-start'}
						crossAlignment={'flex-start'}
						gap={'0.5rem'}
					>
						<Icon icon={'AlertCircleOutline'} color={'error'} size={'large'} />
						<Text weight="bold">{t('', 'Remove all collaborators')}</Text>
					</Container>
				),
				onClose: () => {
					closeModal(modalId);
				},
				children: (
					<Container
						mainAlignment={'flex-start'}
						crossAlignment={'flex-start'}
						padding={{ vertical: 'large' }}
						gap="2rem"
					>
						<Text overflow="break-word">
							{t(
								'',
								"You're about to remove all collaborators from this file. After this action, only you will have access to the file and people it was shared with will no longer be able to view or edit it."
							)}
						</Text>
						<Text color="error" weight="bold">
							{t('', 'This action cannot be undone.')}
						</Text>
					</Container>
				),
				customFooter: (
					<Container mainAlignment={'flex-end'} orientation={'horizontal'} gap="0.5rem">
						<Button
							label={t('', 'No, cancel')}
							onClick={() => closeModal(modalId)}
							color={'secondary'}
							type="outlined"
						/>
						<Button
							// eslint-disable-next-line jsx-a11y/no-autofocus
							autoFocus
							label={t('', 'Yes, remove all')}
							onClick={() => {
								deleteShare(node, allCollaboratorIds).then(() => {
									closeModal(modalId);
									setSelectedIds([]);
								});
							}}
							color="error"
						/>
					</Container>
				)
			});
		} else {
			const modalId = 'delete-modal';
			createModal({
				id: modalId,
				title: (
					<Container
						orientation="horizontal"
						mainAlignment={'flex-start'}
						crossAlignment={'flex-start'}
						gap={'0.5rem'}
					>
						<Icon icon={'AlertCircleOutline'} color={'error'} size={'large'} />
						<Text weight="bold">{t('', 'Remove collaborators')}</Text>
					</Container>
				),
				onClose: () => {
					closeModal(modalId);
				},
				children: (
					<Container
						mainAlignment={'flex-start'}
						crossAlignment={'flex-start'}
						padding={{ vertical: 'large' }}
						gap="2rem"
					>
						<Text overflow="break-word">
							{t(
								'',
								`You're about to remove ${selectedIds.length} collaborator(s) from this file. After this action, these people will no longer be able to view or edit it.`
							)}
						</Text>
						<Text color="error" weight="bold">
							{t('', 'This action cannot be undone.')}
						</Text>
					</Container>
				),
				customFooter: (
					<Container mainAlignment={'flex-end'} orientation={'horizontal'} gap="0.5rem">
						<Button
							label={t('', 'No, cancel')}
							onClick={() => closeModal(modalId)}
							color={'secondary'}
							type="outlined"
						/>
						<Button
							// eslint-disable-next-line jsx-a11y/no-autofocus
							autoFocus
							label={t('', 'Yes, remove')}
							onClick={() => {
								deleteShare(node, selectedIds).then(() => {
									closeModal(modalId);
									setSelectedIds([]);
								});
							}}
							color="error"
						/>
					</Container>
				)
			});
		}
	}, [
		allCollaboratorIds,
		closeModal,
		createModal,
		deleteShare,
		isAllSelected,
		node,
		selectedIds,
		t
	]);

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
		return updateShare(node, ids, permission).then(() => {
			if (ids.includes(me)) {
				getPermissionsLazy();
			}
			setSelectedIds([]);
			setBulkEditActiveRow(0);
			setBulkEditCheckboxValue(false);
		});
	}, [
		allCollaboratorIds,
		bulkEditActiveRow,
		bulkEditCheckboxValue,
		getPermissionsLazy,
		isAllSelected,
		me,
		node,
		selectedIds,
		updateShare
	]);

	const { openDecreaseYourOwnSharePermissionModal } = useDecreaseYourOwnSharePermissionModal(
		bulkUpdateShareAction as unknown as UpdateShareAction
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
		}
	}, [
		bulkUpdateShareAction,
		isBulkEditDecreasingOwnPermission,
		openDecreaseYourOwnSharePermissionModal
	]);

	const collaborators = useMemo(
		() =>
			reduce<NonNullable<GetSharesQuery['getNode']>['shares'][number], React.JSX.Element[]>(
				data?.getNode?.shares,
				(accumulator, share) => {
					if (share && shareTargetExists(share)) {
						const listItem = (
							<ShareListItem
								key={`${share.share_target.id}`}
								share={share}
								permissions={node.permissions}
								yourself={share.share_target.id === me}
								deleteShare={deleteShare}
								isSelected={selectedIds.includes(share.share_target.id)}
								isSelecting={selectedIds.length > 0}
								onSelectionChange={handleSelectionChange}
								selectionMode={selectionMode}
							/>
						);
						if (share.share_target.id === me) {
							accumulator.unshift(listItem);
						} else {
							accumulator.push(listItem);
						}
					}
					return accumulator;
				},
				[]
			),
		[
			data?.getNode?.shares,
			deleteShare,
			handleSelectionChange,
			me,
			node.permissions,
			selectedIds,
			selectionMode
		]
	);

	const ownerListItem = useMemo(() => {
		if (!node.owner) {
			return null;
		}
		const label =
			node.owner.id === me ? t('displayer.share.chip.you', 'You') : getChipLabel(node.owner);
		return (
			<>
				<Container
					mainAlignment={'flex-start'}
					crossAlignment={'flex-start'}
					orientation={'horizontal'}
					padding={'0.5rem'}
					gap={'0.5rem'}
				>
					<Avatar label={node.owner.email} />
					<Container mainAlignment={'flex-start'} crossAlignment={'flex-start'}>
						<Text size={SHARE_TEXT_SIZE}>
							{label} - {t('displayer.share.chip.owner', 'Owner')}
						</Text>
						<Text size={'extrasmall'} color="secondary">
							{node.owner.email}
						</Text>
					</Container>
				</Container>
				<Divider color={'gray3'} />
			</>
		);
	}, [me, node.owner, t]);

	const linkName = useMemo(
		() =>
			isFile(node)
				? t('publicLink.fileLink.title', { defaultValue_one: 'Public download link', count: 1 })
				: t('publicLink.folderLink.title', { defaultValue_one: 'Public access link', count: 1 }),
		[node, t]
	);

	const linkTitle = useMemo(
		() =>
			isFile(node)
				? t('publicLink.fileLink.title', { defaultValue_other: 'Public download links', count: 2 })
				: t('publicLink.folderLink.title', { defaultValue_other: 'Public access links', count: 2 }),
		[node, t]
	);

	const linkDescription = useMemo(
		() =>
			isFile(node)
				? t(
						'publicLink.fileLink.addLink.description',
						'Internal and external users that have access to the link can download the item.'
					)
				: t(
						'publicLink.folderLink.addLink.description',
						'Anyone with this link can view and download the content of this folder.'
					),
		[node, t]
	);

	return (
		<MainContainer
			mainAlignment="flex-start"
			background={'gray5'}
			height={cssCalcBuilder('100%', ['-', '3.125rem'])}
			data-testid="node-sharing"
		>
			<Container
				mainAlignment="flex-start"
				crossAlignment="flex-start"
				height="fit"
				padding={{ all: 'large' }}
				background={'gray6'}
				data-testid="node-sharing-collaborators"
			>
				{!node.permissions.can_share && (
					<Padding bottom="large" width="100%">
						<Container
							orientation="horizontal"
							background={'info'}
							minHeight="2.5rem"
							mainAlignment="flex-start"
						>
							<Padding left="small" right="medium">
								<Icon icon="InfoOutline" size="medium" color="gray6" />
							</Padding>
							<Text color="gray6">
								{t(
									'displayer.share.noSharePermissionHeader',
									'You are not allowed to share this item.'
								)}
							</Text>
						</Container>
					</Padding>
				)}
				<Container mainAlignment={'flex-start'} crossAlignment={'flex-start'} gap={'0.5rem'}>
					<Row
						mainAlignment={'space-between'}
						crossAlignment={'center'}
						width={'fill'}
						gap={'0.5rem'}
					>
						<Row gap={'0.5rem'} mainAlignment={'flex-start'} crossAlignment={'center'}>
							{node.permissions.can_share && collaborators.length > 0 && (
								<Checkbox
									value={isAllSelected}
									onClick={handleSelectAll}
									iconColor={isAllSelected ? 'primary' : undefined}
								/>
							)}
							<Text weight={'bold'}>
								{t('displayer.share.allCollaborators', 'All Collaborators')}
							</Text>
							{collaborators.length > 0 && <Text>({collaborators.length})</Text>}
						</Row>
						{selectedIds.length > 0 && (
							<Row gap={'0.5rem'} mainAlignment={'flex-end'} crossAlignment={'center'}>
								<Text color={'primary'}>
									{t('displayer.share.selected', '{{count}} selected', {
										count: selectedIds.length
									})}
								</Text>
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
								<Tooltip label={t('', 'Remove collaborators for all')}>
									<Button
										icon={'Trash2Outline'}
										color={'error'}
										type={'outlined'}
										onClick={handleBulkDelete}
									/>
								</Tooltip>
							</Row>
						)}
					</Row>
					<ScrollContainer
						mainAlignment={'flex-start'}
						crossAlignment={'flex-start'}
						height={'fit'}
						maxHeight={'14rem'}
						data-testid={'sharing-collaborators-section'}
					>
						{ownerListItem}
						{collaborators}
					</ScrollContainer>
				</Container>
				{node.permissions.can_share && <AddSharing node={node} />}
			</Container>
			{node.permissions.can_share && (
				<CollaborationLinks
					nodeId={node.id}
					nodeName={node.name}
					canWrite={
						isFile(node) ? node.permissions.can_write_file : node.permissions.can_write_folder
					}
				/>
			)}
			{node.permissions.can_share && (
				<PublicLink
					nodeId={node.id}
					nodeName={node.name}
					linkName={linkName}
					linkTitle={linkTitle}
					linkDescription={linkDescription}
				/>
			)}
		</MainContainer>
	);
};
