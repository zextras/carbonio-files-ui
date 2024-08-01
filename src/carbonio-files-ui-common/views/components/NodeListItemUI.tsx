/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import {
	Container,
	ContainerProps,
	Icon,
	Padding,
	Row,
	Text
} from '@zextras/carbonio-design-system';

import { ContextualMenu, ContextualMenuProps } from './ContextualMenu';
import { HoverContainer, ListItemContainer, UppercaseText } from './StyledComponents';
import { LIST_ITEM_AVATAR_HEIGHT, LIST_ITEM_HEIGHT } from '../../constants';
import { humanFileSize, cssCalcBuilder } from '../../utils/utils';

export interface NodeListItemUIProps {
	id: string;
	flagActive: boolean;
	disabled: boolean;
	incomingShare: boolean;
	outgoingShare: boolean;
	displayName: string;
	name: string;
	trashed: boolean;
	updatedAt: string;
	extensionOrType: string;
	contextualMenuDisabled: ContextualMenuProps['disabled'];
	contextualMenuOnOpen?: ContextualMenuProps['onOpen'];
	contextualMenuOnClose?: ContextualMenuProps['onClose'];
	contextualMenuActions?: ContextualMenuProps['actions'];
	listItemContainerOnClick?: ContainerProps['onClick'];
	listItemContainerOnDoubleClick?: ContainerProps['onDoubleClick'];
	hoverContainerBackground: ContainerProps['background'];
	listItemContainerContextualMenuActive: boolean;
	listItemContainerDisableHover: boolean;
	nodeAvatarIcon: React.JSX.Element;
	nodeHoverBar?: React.JSX.Element;
	size?: number;
}

export const NodeListItemUI = ({
	id,
	flagActive,
	disabled,
	incomingShare,
	outgoingShare,
	displayName,
	name,
	trashed,
	updatedAt,
	extensionOrType,
	contextualMenuDisabled,
	contextualMenuOnOpen,
	contextualMenuOnClose,
	contextualMenuActions = [],
	listItemContainerOnClick,
	listItemContainerOnDoubleClick,
	hoverContainerBackground,
	listItemContainerContextualMenuActive,
	listItemContainerDisableHover,
	nodeAvatarIcon,
	nodeHoverBar,
	size
}: NodeListItemUIProps): React.JSX.Element => {
	const preventTextSelection = useCallback<React.MouseEventHandler>((e: React.MouseEvent): void => {
		if (e.detail > 1) {
			e.preventDefault();
		}
	}, []);
	return (
		<Container data-testid={id}>
			<ContextualMenu
				disabled={contextualMenuDisabled}
				onOpen={contextualMenuOnOpen}
				onClose={contextualMenuOnClose}
				actions={contextualMenuActions}
			>
				<ListItemContainer
					height={'fit'}
					onClick={listItemContainerOnClick}
					onDoubleClick={listItemContainerOnDoubleClick}
					data-testid={`node-item-${id}`}
					crossAlignment={'flex-end'}
					$contextualMenuActive={listItemContainerContextualMenuActive}
					$disableHover={listItemContainerDisableHover}
					$disabled={disabled}
					onMouseDown={preventTextSelection}
				>
					<HoverContainer
						height={LIST_ITEM_HEIGHT}
						wrap="nowrap"
						mainAlignment="flex-start"
						crossAlignment="center"
						padding={{ all: 'small' }}
						width="fill"
						background={hoverContainerBackground}
					>
						{nodeAvatarIcon}
						<Container
							orientation="vertical"
							crossAlignment="flex-start"
							mainAlignment="space-around"
							padding={{ left: 'large' }}
							minWidth="auto"
							width="fill"
							maxWidth={cssCalcBuilder('100%', ['-', LIST_ITEM_AVATAR_HEIGHT])}
						>
							<Row
								padding={{ vertical: 'extrasmall' }}
								width="fill"
								wrap="nowrap"
								mainAlignment="space-between"
							>
								<Text overflow="ellipsis" disabled={disabled} size="medium">
									{name}
								</Text>
								<Container orientation="horizontal" mainAlignment="flex-end" width="fit">
									{flagActive && (
										<Padding left="extrasmall">
											<Icon icon="Flag" color="error" disabled={disabled} />
										</Padding>
									)}
									{incomingShare && (
										<Padding left="extrasmall">
											<Icon icon="ArrowCircleLeft" color={'linked'} disabled={disabled} />
										</Padding>
									)}
									{outgoingShare && (
										<Padding left="extrasmall">
											<Icon icon="ArrowCircleRight" color="shared" disabled={disabled} />
										</Padding>
									)}
									{trashed && (
										<Padding left="extrasmall">
											<Icon icon="Trash2Outline" disabled={disabled} />
										</Padding>
									)}
									<Padding left="extrasmall">
										<Text size="extrasmall" color="gray1" disabled={disabled}>
											{updatedAt}
										</Text>
									</Padding>
								</Container>
							</Row>
							<Row
								padding={{ vertical: 'extrasmall' }}
								width="fill"
								wrap="nowrap"
								mainAlignment="flex-start"
							>
								<Container
									flexShrink={0}
									flexGrow={1}
									flexBasis="auto"
									mainAlignment="flex-start"
									orientation="horizontal"
									width="fit"
								>
									<UppercaseText color="gray1" disabled={disabled} size="small">
										{extensionOrType}
									</UppercaseText>
									{size && (
										<Padding left="small">
											<UppercaseText color="gray1" disabled={disabled} size="small">
												{humanFileSize(size)}
											</UppercaseText>
										</Padding>
									)}
								</Container>
								{displayName && (
									<Container
										width="fit"
										minWidth={0}
										flexShrink={1}
										flexGrow={1}
										flexBasis="auto"
										orientation="horizontal"
										mainAlignment="flex-end"
										padding={{ left: 'small' }}
									>
										<Text size="extrasmall" overflow="ellipsis">
											{displayName}
										</Text>
									</Container>
								)}
							</Row>
						</Container>
					</HoverContainer>
					{nodeHoverBar}
				</ListItemContainer>
			</ContextualMenu>
		</Container>
	);
};
