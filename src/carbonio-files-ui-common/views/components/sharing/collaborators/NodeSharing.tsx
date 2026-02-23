/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useState } from 'react';

import { FetchResult } from '@apollo/client';
import styled from '@emotion/styled';
import {
	Avatar,
	Button,
	Checkbox,
	Container,
	Divider,
	Icon,
	Padding,
	Row,
	Text,
	Tooltip
} from '@zextras/carbonio-design-system';
import { reduce } from 'lodash';
import { useTranslation } from 'react-i18next';

import { AddSharing } from './AddSharing';
import { EditPermissionBulkButton } from './EditPermissionBulkButton';
import { ShareListItem } from './ShareListItem';
import { useUserInfo } from '../../../../../hooks/useUserInfo';
import { SHARE_TEXT_SIZE } from '../../../../constants';
import { useDeleteSharesMutation } from '../../../../hooks/graphql/mutations/useDeleteSharesMutation';
import { useGetSharesQuery } from '../../../../hooks/graphql/queries/useGetSharesQuery';
import { useDeleteSharesModal } from '../../../../hooks/useDeleteSharesModal';
import { Node } from '../../../../types/common';
import {
	DeleteSharesMutation,
	GetSharesQuery,
	Maybe,
	Share
} from '../../../../types/graphql/types';
import { DeepPick, MakePartial, MakeRequiredNonNull } from '../../../../types/utils';
import { cssCalcBuilder, getChipLabel, isFile } from '../../../../utils/utils';
import { CollaborationLinks } from '../collaborationLinks/CollaborationLinks';
import { PublicLink } from '../publicLink/PublicLink';

const MainContainer = styled(Container)`
	gap: ${({ theme }): string => theme.sizes.padding.medium};
	overflow-y: auto;
`;

const ScrollContainer = styled(Container)`
	overflow-y: auto;
	overflow-x: hidden;
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
	const { data } = useGetSharesQuery(node.id);
	const deleteShares = useDeleteSharesMutation();

	const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

	const deleteShareBulkAction = useCallback(
		(): Promise<FetchResult<DeleteSharesMutation>> => deleteShares(node, selectedIds),
		[deleteShares, node, selectedIds]
	);

	const deleteShareActionCallback = useCallback((): void => {
		setSelectedIds([]);
	}, []);

	const bulkShareTarget = useMemo(() => {
		if (selectedIds.length !== 1) {
			return null;
		}
		const selectedShare = data?.getNode?.shares?.find(
			(share) => share && share.share_target && share.share_target.id === selectedIds[0]
		);
		return selectedShare?.share_target ?? null;
	}, [data?.getNode?.shares, selectedIds]);

	const bulkIsYourShare = useMemo(
		() => selectedIds.length === 1 && selectedIds[0] === me,
		[me, selectedIds]
	);

	const { openDeleteSharesModal } = useDeleteSharesModal(
		deleteShareBulkAction,
		bulkShareTarget,
		bulkIsYourShare,
		deleteShareActionCallback,
		isAllSelected,
		selectedIds.length
	);

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
								deleteShares={deleteShares}
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
			deleteShares,
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
					height={'fit'}
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
						data-testid="node-sharing-collaborators-header"
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
							<Row gap={'0.25rem'} mainAlignment={'flex-end'} crossAlignment={'center'}>
								<Row
									orientation={'horizontal'}
									mainAlignment={'flex-start'}
									crossAlignment={'center'}
									gap={'0.5rem'}
								>
									<Text color={'primary'}>
										{t('displayer.share.selected', '{{count}} selected', {
											count: selectedIds.length
										})}
									</Text>
									<EditPermissionBulkButton
										node={node}
										data={data}
										me={me}
										isAllSelected={isAllSelected}
										allCollaboratorIds={allCollaboratorIds}
										selectedIds={selectedIds}
										setSelectedIds={setSelectedIds}
									/>
								</Row>
								<Tooltip
									label={t(
										'displayer.share.chip.tooltip.remove.bulk',
										'Remove collaboration for all'
									)}
								>
									<Button
										icon={'Trash2Outline'}
										color={'error'}
										type={'outlined'}
										onClick={openDeleteSharesModal}
									/>
								</Tooltip>
							</Row>
						)}
					</Row>
					<Container
						mainAlignment={'flex-start'}
						crossAlignment={'flex-start'}
						maxHeight={'14rem'}
						data-testid={'sharing-collaborators-section'}
					>
						<ScrollContainer mainAlignment={'flex-start'} crossAlignment={'flex-start'}>
							{collaborators}
						</ScrollContainer>
						{ownerListItem}
					</Container>
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
