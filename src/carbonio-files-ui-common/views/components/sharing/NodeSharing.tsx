/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import {
	Chip,
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
import styled from 'styled-components';

import { AddSharing } from './AddSharing';
import { CollaborationLinks } from './collaborationLinks/CollaborationLinks';
import { EditShareChip } from './EditShareChip';
import { PublicLink } from './publicLink/PublicLink';
import { useUserInfo } from '../../../../hooks/useUserInfo';
import { SHARE_CHIP_MAX_WIDTH, SHARE_CHIP_SIZE } from '../../../constants';
import { useDeleteShareMutation } from '../../../hooks/graphql/mutations/useDeleteShareMutation';
import { useGetSharesQuery } from '../../../hooks/graphql/queries/useGetSharesQuery';
import { Node } from '../../../types/common';
import { GetSharesQuery, Maybe, Share } from '../../../types/graphql/types';
import { DeepPick, MakePartial, MakeRequiredNonNull } from '../../../types/utils';
import { cssCalcBuilder, getChipLabel, getChipTooltip, isFile } from '../../../utils/utils';

const MainContainer = styled(Container)`
	gap: ${({ theme }): string => theme.sizes.padding.medium};
	overflow-y: auto;
`;

const ScrollContainer = styled(Container).attrs(({ theme }) => ({
	$marginSize: cssCalcBuilder(theme.sizes.padding.extrasmall, ['/', 2])
}))`
	overflow-y: auto;

	> div {
		margin: ${({ $marginSize }): string => `${$marginSize} ${$marginSize} ${$marginSize} 0`};
	}
`;

const CustomText = styled(Text)`
	flex-shrink: 0;
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

	const deleteShare = useDeleteShareMutation();

	const collaborators = useMemo(
		() =>
			reduce<NonNullable<GetSharesQuery['getNode']>['shares'][number], React.JSX.Element[]>(
				data?.getNode?.shares,
				(accumulator, share) => {
					if (share && shareTargetExists(share)) {
						const chip = (
							<EditShareChip
								key={`${share.share_target.id}`}
								share={share}
								permissions={node.permissions}
								yourselfChip={share.share_target.id === me}
								deleteShare={deleteShare}
							/>
						);
						if (share.share_target.id === me) {
							accumulator.unshift(chip);
						} else {
							accumulator.push(chip);
						}
					}
					return accumulator;
				},
				[]
			),
		[data?.getNode?.shares, node.permissions, me, deleteShare]
	);

	const ownerChip = useMemo(() => {
		const label =
			node.owner?.id === me ? t('displayer.share.chip.you', 'You') : getChipLabel(node.owner);
		return (
			<Chip
				size={SHARE_CHIP_SIZE}
				avatarLabel={getChipLabel(node.owner)}
				maxWidth={SHARE_CHIP_MAX_WIDTH}
				label={
					<Row wrap="nowrap">
						<Tooltip label={getChipTooltip(node.owner)} maxWidth="100%">
							<Text size={SHARE_CHIP_SIZE} weight="light">
								{label}
							</Text>
						</Tooltip>
						<CustomText size={SHARE_CHIP_SIZE} weight="light" color="secondary">
							&nbsp;-&nbsp;{t('displayer.share.chip.owner', 'Owner')}
						</CustomText>
					</Row>
				}
			/>
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
				<Container
					crossAlignment="flex-start"
					mainAlignment="flex-start"
					width="fill"
					padding={{ bottom: 'small' }}
				>
					<Padding bottom="small">
						<Text weight="bold">{t('displayer.details.collaborators', 'Collaborators')}</Text>
					</Padding>
					<ScrollContainer
						maxHeight="8.25rem"
						mainAlignment="flex-start"
						orientation="horizontal"
						padding={{ horizontal: 'small' }}
						wrap="wrap"
					>
						{ownerChip}
						{collaborators}
					</ScrollContainer>
				</Container>
				{node.permissions.can_share && <Divider />}
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
