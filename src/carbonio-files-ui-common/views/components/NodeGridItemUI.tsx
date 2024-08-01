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
	Row,
	Text
} from '@zextras/carbonio-design-system';
import styled, { css, SimpleInterpolation } from 'styled-components';

import { ContextualMenu, ContextualMenuProps } from './ContextualMenu';
import { UppercaseText } from './StyledComponents';
import { humanFileSize } from '../../utils/utils';

export const HoverContainer = styled(Container)``;

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
						background={hoverContainerBackground}
						padding={{ vertical: 'small', horizontal: 'medium' }}
						minHeight={'4.625rem'}
						height={'4.625rem'}
						orientation={'horizontal'}
						gap={'0.5rem'}
					>
						{nodeAvatarIcon}
						<Container crossAlignment={'flex-start'} minWidth={0}>
							<Text overflow="ellipsis" disabled={disabled} size="extrasmall">
								{name}
							</Text>
							<Row gap={'0.25rem'}>
								<UppercaseText color="gray1" disabled={disabled} size="extrasmall">
									{extensionOrType}
								</UppercaseText>
								{size && (
									<UppercaseText color="gray1" disabled={disabled} size="extrasmall">
										{humanFileSize(size)}
									</UppercaseText>
								)}
							</Row>
							<Text size="extrasmall" color="gray1" disabled={disabled}>
								{updatedAt}
							</Text>
						</Container>
						<Container crossAlignment={'flex-end'} width={'fit'} gap={'0.5rem'}>
							<Container
								width={'fit'}
								mainAlignment={'flex-end'}
								orientation={'horizontal'}
								gap={'0.25rem'}
								height={'fit'}
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
							</Container>
							{displayName && (
								<Text size="extrasmall" overflow="ellipsis">
									{displayName}
								</Text>
							)}
						</Container>
					</HoverContainer>
				</Container>
			</ContextualMenu>
		</ContainerCell>
	);
};
