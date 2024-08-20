/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useState } from 'react';

import {
	Button,
	Container,
	ContainerProps,
	Dropdown,
	getColor,
	Icon,
	Text
} from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import styled, { css, SimpleInterpolation } from 'styled-components';

import { ContextualMenu, ContextualMenuProps } from './ContextualMenu';
import { GridItem, UppercaseText } from './StyledComponents';
import { humanFileSize } from '../../utils/utils';

const Image = styled.img`
	width: 100%;
	height: 100%;
	object-fit: cover;
`;

export const HoverContainer = styled(Container)``;

const FooterGrid = styled(Container)`
	display: grid;
	justify-content: space-between;
`;

const ContainerCell = styled(Container).attrs<
	{
		$contextualMenuActive?: boolean;
		$disabled?: boolean;
		$disableHover?: boolean;
		$showPreview?: boolean;
	},
	{ backgroundColor?: string }
>(({ $contextualMenuActive, $disabled, theme }) => ({
	backgroundColor:
		($disabled && getColor('gray6.disabled', theme)) ||
		($contextualMenuActive && getColor('gray6.hover', theme)) ||
		undefined
}))<{
	$contextualMenuActive?: boolean;
	$disabled?: boolean;
	$disableHover?: boolean;
	$showPreview?: boolean;
}>`
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
	${({ $showPreview }): SimpleInterpolation =>
		$showPreview &&
		css`
			aspect-ratio: 1/1;
		`};
	overflow: hidden;
	border-radius: 5px;
	border: 1px solid ${({ theme }): SimpleInterpolation => theme.palette.gray2.disabled};
`;

const Preview = styled(Container)`
	overflow: hidden;
`;

const PreviewIcon = styled(Icon)`
	height: 3.75rem;
	width: 3.75rem;
`;

interface NodeGridItemProps {
	id: string;
	showPreview?: boolean;
	icon: string;
	color: string;
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
	createImgSrc?: (args: { width: number; height: number }) => string | undefined;
}

export const NodeGridItemUI: React.VFC<NodeGridItemProps> = ({
	id,
	showPreview,
	icon,
	color,
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
	createImgSrc
}) => {
	const [imgSrc, setImgSrc] = useState<string>();

	const previewRef = useCallback<React.RefCallback<HTMLDivElement>>(
		(node) => {
			if (node) {
				setImgSrc((prevState) => {
					if (prevState) {
						return prevState;
					}
					return createImgSrc?.({
						width: Math.floor(node.clientWidth * 1.5),
						height: Math.floor(node.clientHeight * 1.5)
					});
				});
			}
		},
		[createImgSrc]
	);

	const [previewFailed, setPreviewFailed] = useState(false);

	const onPreviewError = useCallback(() => {
		setPreviewFailed(true);
	}, []);

	const [t] = useTranslation();

	return (
		<ContextualMenu
			disabled={contextualMenuDisabled}
			onOpen={contextualMenuOnOpen}
			onClose={contextualMenuOnClose}
			actions={contextualMenuActions}
		>
			<ContainerCell
				$showPreview={showPreview}
				height={showPreview ? 'fill' : 'fit'}
				// id required for scrollToNodeItem function
				id={id}
				$contextualMenuActive={listItemContainerContextualMenuActive}
				$disableHover={listItemContainerDisableHover}
				$disabled={disabled}
				onClick={listItemContainerOnClick}
				onDoubleClick={listItemContainerOnDoubleClick}
			>
				<Container background={'gray5'}>
					{showPreview && (
						<Preview
							ref={previewRef}
							data-testid={'grid-cell-thumbnail'}
							minHeight={0}
							orientation={'horizontal'}
						>
							{(imgSrc && !previewFailed && (
								<Image src={imgSrc} alt={''} onError={onPreviewError} />
							)) ||
								(imgSrc && previewFailed && (
									<Text
										size={'extrasmall'}
										color={'secondary'}
										overflow={'break-word'}
										textAlign={'center'}
									>
										{t('node.preview.failed', 'Failed to load image')}
									</Text>
								)) || <PreviewIcon icon={icon} color={color} />}
						</Preview>
					)}
					<HoverContainer
						maxWidth={'100%'}
						background={hoverContainerBackground}
						padding={'small'}
						minHeight={'4.625rem'}
						height={'4.625rem'}
						orientation={'horizontal'}
						gap={'0.5rem'}
					>
						{nodeAvatarIcon}
						<FooterGrid minWidth={0}>
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
										{humanFileSize(size, t)}
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
									<Button
										size={'medium'}
										icon="MoreVertical"
										disabled={disabled}
										onClick={() => undefined}
										type={'ghost'}
										color={'text'}
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
			</ContainerCell>
		</ContextualMenu>
	);
};
