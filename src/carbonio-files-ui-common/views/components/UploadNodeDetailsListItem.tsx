/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { useQuery } from '@apollo/client';
import { Container, Text } from '@zextras/carbonio-design-system';
import { reduce } from 'lodash';

import { LIST_ITEM_AVATAR_HEIGHT_COMPACT } from '../../constants';
import { Breadcrumbs } from '../../design_system_fork/Breadcrumbs';
import { useUploadActions } from '../../hooks/useUploadActions';
import { Action, Crumb } from '../../types/common';
import { UploadItem, UploadStatus } from '../../types/graphql/client-types';
import { GetUploadItemDocument } from '../../types/graphql/types';
import { ActionsFactoryCheckerMap, ActionsFactoryUploadItem } from '../../utils/ActionsFactory';
import { getUploadNodeType, isUploadFolderItem } from '../../utils/uploadUtils';
import { getIconByFileType } from '../../utils/utils';
import { NodeAvatarIcon } from './NodeAvatarIcon';
import { NodeHoverBar } from './NodeHoverBar';
import { HoverContainer, ListItemContainer } from './StyledComponents';
import { UploadStatusComponent } from './UploadStatusComponent';

interface UploadNodeDetailsListItemProps {
	id: string;
}

export const UploadNodeDetailsListItem = ({ id }: UploadNodeDetailsListItemProps): JSX.Element => {
	const { data } = useQuery(GetUploadItemDocument, { variables: { id } });

	const item = useMemo<UploadItem | undefined>(() => data?.getUploadItem || undefined, [data]);

	const crumbs = useMemo<Crumb[]>(
		() =>
			reduce<string, Crumb[]>(
				item?.fullPath.split('/'),
				(accumulator, pathEntry, index, initialArray) => {
					if (pathEntry && index < initialArray.length - 1) {
						accumulator.push({
							id: `path-${index}`,
							label: pathEntry,
							disabled: true,
							onClick: undefined
						});
					}
					return accumulator;
				},
				[]
			),
		[item?.fullPath]
	);

	const actionCheckers = useMemo<ActionsFactoryCheckerMap>(
		() => ({
			[Action.GoToFolder]: (actionsFactoryUploadItem): boolean =>
				(actionsFactoryUploadItem[0] as ActionsFactoryUploadItem).nodeId !== null,
			[Action.RemoveUpload]: (actionsFactoryUploadItem): boolean =>
				(actionsFactoryUploadItem[0] as ActionsFactoryUploadItem).status !== UploadStatus.COMPLETED
		}),
		[]
	);

	const hoverActions = useUploadActions(item ? [item] : [], actionCheckers);

	return (
		(item && (
			<ListItemContainer
				height={'fit'}
				crossAlignment="flex-end"
				data-testid={`details-node-item-${item.id}`}
			>
				<HoverContainer
					wrap={'nowrap'}
					mainAlignment={'flex-start'}
					crossAlignment={'center'}
					padding={{ all: 'small' }}
					width={'fill'}
					background={'gray6'}
					orientation={'horizontal'}
					gap={'0.5rem'}
				>
					<NodeAvatarIcon
						selectionModeActive={false}
						selected={false}
						icon={`${getIconByFileType(getUploadNodeType(item))}Outline`}
						compact
					/>
					<Container
						orientation="vertical"
						width={'auto'}
						flexGrow={1}
						flexShrink={1}
						mainAlignment="flex-start"
						crossAlignment={'flex-start'}
						minWidth={0}
					>
						<Text overflow="ellipsis" size="small">
							{item.name}
						</Text>
						<Breadcrumbs crumbs={crumbs} $size={'extrasmall'} color={'gray0.disabled'} />
					</Container>
					<UploadStatusComponent
						status={item.status}
						gap={'0.5rem'}
						progress={item.progress}
						contentCount={(isUploadFolderItem(item) && item.contentCount) || undefined}
					/>
				</HoverContainer>
				<NodeHoverBar
					actions={hoverActions}
					height={'100%'}
					width={`calc(100% - ${LIST_ITEM_AVATAR_HEIGHT_COMPACT})`}
					padding={{ right: '0.5rem' }}
				/>
			</ListItemContainer>
		)) || <></>
	);
};
