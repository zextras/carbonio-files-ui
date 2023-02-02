/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import {
	Avatar,
	Container,
	Row,
	Text,
	getColor,
	Shimmer,
	ModalBody
} from '@zextras/carbonio-design-system';
import styled, { css, SimpleInterpolation } from 'styled-components';

import {
	LIST_ITEM_AVATAR_HEIGHT,
	LIST_ITEM_AVATAR_HEIGHT_COMPACT,
	LIST_ITEM_AVATAR_ICON_HEIGHT,
	LIST_ITEM_AVATAR_ICON_HEIGHT_COMPACT
} from '../../constants';
import { cssCalcBuilder } from '../../utils/utils';

export const DisplayerContentContainer = styled(Container)`
	padding-bottom: 2rem;
	overflow-y: auto;
`;

export const HoverContainer = styled(Row)`
	width: 100%;
`;

export const HoverBarContainer = styled(Row).attrs(({ height = '45%', width, theme }) => ({
	height,
	width: width || `calc(100% - ${LIST_ITEM_AVATAR_HEIGHT} - ${theme.sizes.padding.small})`
}))`
	display: none;
	position: absolute;
	top: 0;
	right: 0;
	background: linear-gradient(
		to right,
		transparent,
		${({ theme }): string => theme.palette.gray6.hover}
	);
`;

interface ListItemContainerProps {
	$contextualMenuActive?: boolean;
	$disabled?: boolean;
	$disableHover?: boolean;
}

export const ListItemContainer = styled(Container).attrs<
	ListItemContainerProps,
	{ backgroundColor?: string }
>(({ $contextualMenuActive, $disabled, theme }) => ({
	backgroundColor:
		($disabled && getColor('gray6.disabled', theme)) ||
		($contextualMenuActive && getColor('gray6.hover', theme)) ||
		undefined
}))<ListItemContainerProps>`
	position: relative;
	${HoverContainer} {
		background-color: ${({ backgroundColor }): SimpleInterpolation => backgroundColor};
	}
	${HoverBarContainer} {
		display: none;
	}

	${({ $disableHover, theme }): SimpleInterpolation =>
		!$disableHover &&
		css`
			&:hover {
				${HoverBarContainer} {
					display: flex;
				}

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
`;

export const CheckedAvatar = styled(Avatar)`
	border-radius: 0.5rem;
	min-height: ${LIST_ITEM_AVATAR_HEIGHT};
	max-height: ${LIST_ITEM_AVATAR_HEIGHT};
	min-width: ${LIST_ITEM_AVATAR_HEIGHT};
	max-width: ${LIST_ITEM_AVATAR_HEIGHT};
	flex: 0 0 auto;
	align-self: center;

	& > svg {
		width: 1.5rem;
		height: 1.5rem;
	}
`;

export const UncheckedAvatar = styled(Avatar)`
	border-radius: 0.5rem;
	min-height: ${LIST_ITEM_AVATAR_HEIGHT};
	max-height: ${LIST_ITEM_AVATAR_HEIGHT};
	min-width: ${LIST_ITEM_AVATAR_HEIGHT};
	max-width: ${LIST_ITEM_AVATAR_HEIGHT};
	flex: 0 0 auto;
	align-self: center;
	border: 0.0625rem solid ${(props): string => props.theme.palette.primary.regular};
	box-sizing: border-box;
`;

export const FileIconPreview = styled(Avatar)<{ $compact?: boolean }>`
	border-radius: 0.5rem;
	min-height: ${({ $compact }): string =>
		$compact ? LIST_ITEM_AVATAR_HEIGHT_COMPACT : LIST_ITEM_AVATAR_HEIGHT};
	max-height: ${({ $compact }): string =>
		$compact ? LIST_ITEM_AVATAR_HEIGHT_COMPACT : LIST_ITEM_AVATAR_HEIGHT};
	min-width: ${({ $compact }): string =>
		$compact ? LIST_ITEM_AVATAR_HEIGHT_COMPACT : LIST_ITEM_AVATAR_HEIGHT};
	max-width: ${({ $compact }): string =>
		$compact ? LIST_ITEM_AVATAR_HEIGHT_COMPACT : LIST_ITEM_AVATAR_HEIGHT};
	flex: 0 0 auto;
	align-self: center;

	& > svg {
		max-width: ${({ $compact }): string =>
			$compact ? LIST_ITEM_AVATAR_ICON_HEIGHT_COMPACT : LIST_ITEM_AVATAR_ICON_HEIGHT};
		max-height: ${({ $compact }): string =>
			$compact ? LIST_ITEM_AVATAR_ICON_HEIGHT_COMPACT : LIST_ITEM_AVATAR_ICON_HEIGHT};
		min-width: ${({ $compact }): string =>
			$compact ? LIST_ITEM_AVATAR_ICON_HEIGHT_COMPACT : LIST_ITEM_AVATAR_ICON_HEIGHT};
		min-height: ${({ $compact }): string =>
			$compact ? LIST_ITEM_AVATAR_ICON_HEIGHT_COMPACT : LIST_ITEM_AVATAR_ICON_HEIGHT};
	}
`;

export const CenteredText = styled(Text)<{ $width?: string }>`
	text-align: center;
	width: ${({ $width }): string => $width || 'auto'};
`;

export const InlineText = styled(Text)`
	display: inline;
`;

export const OverFlowHiddenRow = styled(Row)`
	overflow: hidden;
`;

export const ItalicText = styled(Text)`
	font-style: italic;
`;

export const ShimmerText = styled(Shimmer.Text).attrs<{
	$size: 'extrasmall' | 'small' | 'medium' | 'large' | 'extralarge';
}>(({ $size, theme }) => ({
	height: cssCalcBuilder(theme.sizes.font[$size], ['*', 1.2]),
	'data-testid': 'shimmer-text'
}))``;

export const TextWithLineHeight = styled(Text)`
	line-height: 1.5;
`;

export const CustomModalBody = styled(ModalBody)`
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	flex: 1 1 auto;
`;

export interface HintProps {
	label: string;
	email?: string;
}

export const Hint: React.VFC<HintProps> = ({ label, email }) => (
	<Container
		orientation="horizontal"
		mainAlignment="flex-start"
		crossAlignment="center"
		minWidth="16rem"
		minHeight="2rem"
	>
		<Avatar label={label} />
		<Container orientation="vertical" crossAlignment="flex-start" padding={{ left: 'small' }}>
			{email !== undefined && label !== email ? (
				<>
					<Row takeAvailableSpace mainAlignment="flex-start">
						<Text size="medium">{label}</Text>
					</Row>
					<Row takeAvailableSpace mainAlignment="flex-start">
						<Text color="secondary" size="small">
							{email}
						</Text>
					</Row>
				</>
			) : (
				<Text size="medium">{label}</Text>
			)}
		</Container>
	</Container>
);

const SkeletonTile = styled.div<{ width: string; height: string; radius: string }>`
	width: ${({ width }): string => width ?? '1rem'};
	max-width: ${({ width }): string => width ?? '1rem'};
	min-width: ${({ width }): string => width ?? '1rem'};
	height: ${({ height }): string => height ?? '1rem'};
	max-height: ${({ height }): string => height ?? '1rem'};
	min-height: ${({ height }): string => height ?? '1rem'};
	border-radius: ${({ radius }): string => radius ?? '0.125rem'};
	background: ${({ theme }): string => theme.palette.gray2.regular};
`;

export const Loader: React.VFC = () => (
	<Container
		orientation="horizontal"
		mainAlignment="flex-start"
		crossAlignment="center"
		minWidth="16rem"
		minHeight="2rem"
		data-testid="add-sharing-loader"
	>
		<SkeletonTile radius="50%" width="2rem" height="2rem" />
		<Container orientation="vertical" crossAlignment="flex-start" padding={{ left: 'small' }}>
			<SkeletonTile
				radius="0.25rem"
				width={`${Math.random() * 9.375 + 4}rem`}
				height="0.875rem"
				style={{ marginBottom: '0.25rem' }}
			/>
			<SkeletonTile radius="0.25rem" width={`${Math.random() * 9.375 + 4}rem`} height="0.75rem" />
		</Container>
	</Container>
);
