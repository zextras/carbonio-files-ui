/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useState } from 'react';

import { Action as DSAction, Container, Row, Text } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { LIST_ITEM_HEIGHT } from '../../constants';
import { Breadcrumbs } from '../../design_system_fork/Breadcrumbs';
import { Node } from '../../types/common';
import { UploadStatus } from '../../types/graphql/client-types';
import { Maybe } from '../../types/graphql/types';
import { buildCrumbs, humanFileSize } from '../../utils/utils';
import { ContextualMenu } from './ContextualMenu';
import { NodeAvatarIcon } from './NodeAvatarIcon';
import { NodeHoverBar } from './NodeHoverBar';
import { HoverContainer, ListItemContainer } from './StyledComponents';
import { UploadStatusComponent } from './UploadStatusComponent';

interface UploadListItemProps {
	id: string;
	nodeId?: string;
	name: string;
	parent?: Maybe<Pick<Node, 'id' | 'name' | 'type'>>;
	size?: number;
	extension?: string;
	mimeType: string;
	status: UploadStatus;
	progress: number;
	contentCount?: number;
	permittedContextualMenuActionItems: DSAction[];
	permittedHoverBarActionItems: DSAction[];
	isSelected: boolean;
	isSelectionModeActive: boolean;
	selectId: (id: string) => void;
	isActive: boolean;
	setActive: (event: React.SyntheticEvent | KeyboardEvent) => void;
}

const CustomText = styled(Text)`
	text-transform: uppercase;
`;

const CustomBreadcrumbs = styled(Breadcrumbs)`
	width: auto;
`;

export const UploadListItem = React.memo<UploadListItemProps>(
	({
		id,
		name,
		parent,
		size,
		extension: _extension,
		mimeType: _mimeType,
		status,
		progress,
		isSelected,
		isSelectionModeActive,
		selectId,
		permittedHoverBarActionItems,
		permittedContextualMenuActionItems,
		isActive,
		setActive,
		contentCount
	}) => {
		const [t] = useTranslation();
		const [isContextualMenuActive, setIsContextualMenuActive] = useState(false);

		const openContextualMenuHandler = useCallback(() => {
			setIsContextualMenuActive(true);
		}, []);

		const closeContextualMenuHandler = useCallback(() => {
			setIsContextualMenuActive(false);
		}, []);

		const selectIdCallback = useCallback(
			(event) => {
				event.stopPropagation();
				selectId(id);
			},
			[id, selectId]
		);

		const crumbs = useMemo(() => (parent ? buildCrumbs(parent, undefined, t) : []), [parent, t]);

		return (
			<ContextualMenu
				onOpen={openContextualMenuHandler}
				onClose={closeContextualMenuHandler}
				actions={permittedContextualMenuActionItems}
				disabled={isSelectionModeActive}
			>
				<ListItemContainer
					height="fit"
					crossAlignment="flex-end"
					$contextualMenuActive={isContextualMenuActive}
					data-testid={`node-item-${id}`}
					onClick={setActive}
					$disableHover={isContextualMenuActive}
				>
					<HoverContainer
						height={LIST_ITEM_HEIGHT}
						wrap={'nowrap'}
						mainAlignment={'flex-start'}
						crossAlignment={'center'}
						padding={{ all: 'small' }}
						width={'fill'}
						background={isActive ? 'highlight' : 'gray6'}
					>
						<NodeAvatarIcon
							selectionModeActive={isSelectionModeActive}
							selected={isSelected}
							onClick={selectIdCallback}
							icon="CloudUploadOutline"
						/>
						<Container
							orientation="vertical"
							crossAlignment="flex-start"
							mainAlignment="space-around"
							padding={{ horizontal: 'large' }}
							minWidth={0}
						>
							<Row padding={{ vertical: 'extrasmall' }}>
								<Text overflow="ellipsis" size="small">
									{name}
								</Text>
							</Row>
							<Row wrap="nowrap" height="fit" mainAlignment="flex-start" width="fill">
								<CustomBreadcrumbs crumbs={crumbs} $size="small" color="secondary" />
							</Row>
						</Container>
						<Container orientation="vertical" mainAlignment="space-around" width="fit">
							<Container
								orientation="horizontal"
								padding={{ vertical: 'extrasmall' }}
								mainAlignment="flex-end"
							>
								<UploadStatusComponent
									status={status}
									gap={'0.25rem'}
									progress={progress}
									contentCount={contentCount}
								/>
							</Container>
							<Container
								orientation="horizontal"
								padding={{ vertical: 'extrasmall' }}
								mainAlignment="flex-end"
							>
								{size !== undefined && (
									<CustomText size="extrasmall" overflow="ellipsis" color="gray1">
										{humanFileSize(size)}
									</CustomText>
								)}
							</Container>
						</Container>
					</HoverContainer>
					{!isSelectionModeActive && <NodeHoverBar actions={permittedHoverBarActionItems} />}
				</ListItemContainer>
			</ContextualMenu>
		);
	}
);

UploadListItem.displayName = 'UploadListItem';
