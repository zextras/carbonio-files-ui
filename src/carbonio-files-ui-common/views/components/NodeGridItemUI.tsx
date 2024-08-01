/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import {
	Container,
	ContainerProps,
	Dropdown,
	getColor,
	Icon,
	IconButton,
	Text
} from '@zextras/carbonio-design-system';
import styled, { css, SimpleInterpolation } from 'styled-components';

import { ContextualMenu, ContextualMenuProps } from './ContextualMenu';
import { GridItem, UppercaseText } from './StyledComponents';
import { humanFileSize } from '../../utils/utils';

export const HoverContainer = styled(Container)``;

const FooterGrid = styled(Container)`
	display: grid;
	justify-content: space-between;
`;

const ContainerCell = styled(Container).attrs<
	{ $contextualMenuActive?: boolean; $disabled?: boolean; $disableHover?: boolean },
	{ backgroundColor?: string }
>(({ $contextualMenuActive, $disabled, theme }) => ({
	backgroundColor:
		($disabled && getColor('gray6.disabled', theme)) ||
		($contextualMenuActive && getColor('gray6.hover', theme)) ||
		undefined
}))<{ $contextualMenuActive?: boolean; $disabled?: boolean; $disableHover?: boolean }>`
	${HoverContainer} {
		background-color: ${({ backgroundColor }): SimpleInterpolation => backgroundColor};
	}
	${({ $disableHover, theme }): SimpleInterpolation =>
		!$disableHover &&
		css`
			&:hover {
				${HoverContainer} {
					background-color: ${getColor('gray6.hover', theme)};
				}
			}
		`}
	${({ $disabled }): SimpleInterpolation =>
		!$disabled &&
		css`
			cursor: pointer;
		`};
	aspect-ratio: 1/1;
	overflow: hidden;
	border-radius: 5px;
	border: ${({ theme }): SimpleInterpolation => theme.palette.gray2.disabled}, 1px, solid;
`;

const Preview = styled(Container)`
	overflow: hidden;
`;

interface NodeGridItemProps {
	id: string;
	flagActive?: boolean;
	disabled?: boolean;
	incomingShare?: boolean;
	outgoingShare?: boolean;
	displayName?: string;
	name?: string;
	trashed?: boolean;
	updatedAt?: string;
	extensionOrType?: string;
	contextualMenuDisabled?: ContextualMenuProps['disabled'];
	contextualMenuOnOpen?: ContextualMenuProps['onOpen'];
	contextualMenuOnClose?: ContextualMenuProps['onClose'];
	contextualMenuActions?: ContextualMenuProps['actions'];
	listItemContainerOnClick?: ContainerProps['onClick'];
	listItemContainerOnDoubleClick?: ContainerProps['onDoubleClick'];
	hoverContainerBackground?: ContainerProps['background'];
	listItemContainerContextualMenuActive?: boolean;
	listItemContainerDisableHover?: boolean;
	nodeAvatarIcon?: React.JSX.Element;
	size?: number;
	imgSrc?: string;
}

export const NodeGridItemUI: React.VFC<NodeGridItemProps> = ({
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
	size,
	imgSrc
}) => {
	const preventTextSelection = useCallback<React.MouseEventHandler>((e: React.MouseEvent): void => {
		if (e.detail > 1) {
			e.preventDefault();
		}
	}, []);

	return (
		<ContainerCell
			data-testid={id}
			$contextualMenuActive={listItemContainerContextualMenuActive}
			$disableHover={listItemContainerDisableHover}
			$disabled={disabled}
			onClick={listItemContainerOnClick}
			onDoubleClick={listItemContainerOnDoubleClick}
		>
			<ContextualMenu
				disabled={contextualMenuDisabled}
				onOpen={contextualMenuOnOpen}
				onClose={contextualMenuOnClose}
				actions={contextualMenuActions}
			>
				<Container background={'gray5'}>
					<Preview minHeight={0} orientation={'horizontal'}>
						<img src={imgSrc} alt={''} />
					</Preview>
					<HoverContainer
						maxWidth={'100%'}
						background={hoverContainerBackground}
						padding={{ vertical: 'small', horizontal: 'medium' }}
						minHeight={'4.625rem'}
						height={'4.625rem'}
						orientation={'horizontal'}
						gap={'0.5rem'}
					>
						{nodeAvatarIcon}
						<FooterGrid>
							<GridItem
								$alignSelf={'end'}
								crossAlignment={'flex-start'}
								minWidth={0}
								width={'auto'}
								height={'fit'}
								$rowStart={1}
								$rowEnd={3}
								$columnStart={1}
								$columnEnd={3}
							>
								<Text overflow="ellipsis" disabled={disabled} size="small">
									{name}
								</Text>
							</GridItem>
							<GridItem
								mainAlignment={'flex-start'}
								minWidth={0}
								orientation={'horizontal'}
								gap={'0.25rem'}
								width={'fit'}
								height={'fit'}
								$rowStart={3}
								$rowEnd={5}
								$columnStart={1}
								$columnEnd={2}
							>
								<UppercaseText lineHeight={1.5} color="gray1" disabled={disabled} size="extrasmall">
									{extensionOrType}
								</UppercaseText>
								{size && (
									<UppercaseText
										lineHeight={1.5}
										color="gray1"
										disabled={disabled}
										size="extrasmall"
									>
										{humanFileSize(size)}
									</UppercaseText>
								)}
							</GridItem>
							<GridItem
								$alignSelf={'start'}
								minWidth={0}
								width={'auto'}
								crossAlignment={'flex-start'}
								height={'fit'}
								$rowStart={5}
								$rowEnd={7}
								$columnStart={1}
								$columnEnd={2}
							>
								<Text lineHeight={1.5} size="extrasmall" color="gray1" disabled={disabled}>
									{updatedAt}
								</Text>
							</GridItem>
							<GridItem
								$alignSelf={displayName ? 'end' : 'center'}
								padding={{ bottom: displayName ? '0.25rem' : 0 }}
								width={'auto'}
								minWidth={0}
								$rowStart={1}
								$rowEnd={displayName ? 4 : 7}
								$columnStart={3}
								$columnEnd={4}
								height={'fit'}
								mainAlignment={'flex-end'}
								orientation={'horizontal'}
								gap={'0.25rem'}
							>
								{flagActive && <Icon icon="Flag" color="error" disabled={disabled} />}
								{incomingShare && (
									<Icon icon="ArrowCircleLeft" color={'linked'} disabled={disabled} />
								)}
								{outgoingShare && (
									<Icon icon="ArrowCircleRight" color="shared" disabled={disabled} />
								)}
								{trashed && <Icon icon="Trash2Outline" disabled={disabled} />}
								<Dropdown items={contextualMenuActions}>
									<IconButton
										size={'small'}
										icon="MoreVertical"
										disabled={disabled}
										onClick={() => undefined}
									/>
								</Dropdown>
							</GridItem>
							{displayName && (
								<GridItem
									padding={{ top: '0.25rem' }}
									$alignSelf={'start'}
									crossAlignment={'flex-end'}
									width={'auto'}
									minWidth={0}
									height={'fit'}
									$rowStart={4}
									$rowEnd={7}
									$columnStart={2}
									$columnEnd={4}
								>
									<Text
										color={'secondary'}
										lineHeight={1.5}
										textAlign={'end'}
										size="extrasmall"
										overflow="ellipsis"
									>
										{displayName}
									</Text>
								</GridItem>
							)}
						</FooterGrid>
					</HoverContainer>
				</Container>
			</ContextualMenu>
		</ContainerCell>
	);
};
