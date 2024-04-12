/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import {
	Text as DSText,
	type TextProps,
	TextWithTooltip,
	type TextWithTooltipProps
} from '@zextras/carbonio-design-system';
import styled, { type SimpleInterpolation } from 'styled-components';

import { MakeOptional } from '../types/utils';

interface TextExtendedProps {
	width?: string;
	centered?: boolean;
	italic?: boolean;
	inline?: boolean;
	lineHeight?: number;
}

type WithDollarPrefix<S extends string> = `$${S}`;

type WithoutDollarPrefix<S extends string> = S extends `$${infer WithoutDollarString}`
	? WithoutDollarString
	: S;

type StyledTextProps = {
	[K in WithDollarPrefix<
		keyof Omit<TextExtendedProps, 'withTooltip'>
	>]: TextExtendedProps[WithoutDollarPrefix<K>];
};

type TextWithOptionalTooltipProps =
	| ({ withTooltip: true } & MakeOptional<TextWithTooltipProps, 'children'>)
	| ({ withTooltip?: false } & TextProps);

const TextWithOptionalTooltip = ({
	withTooltip,
	children = null,
	...rest
}: TextWithOptionalTooltipProps): React.JSX.Element =>
	withTooltip ? (
		<TextWithTooltip {...rest}>{children}</TextWithTooltip>
	) : (
		<DSText {...rest}>{children}</DSText>
	);

const StyledText = styled(TextWithOptionalTooltip)<StyledTextProps>`
	width: ${({ $width }): SimpleInterpolation => $width};
	display: ${({ $inline }): SimpleInterpolation => $inline && 'inline'};
	font-style: ${({ $italic }): SimpleInterpolation => $italic && 'italic'};
	text-align: ${({ $centered }): SimpleInterpolation => $centered && 'center'};
	line-height: ${({ $lineHeight }): SimpleInterpolation => $lineHeight};
`;
export const Text = ({
	width,
	centered,
	italic,
	inline,
	lineHeight = 1.5,
	withTooltip = false,
	...dsProps
}: TextExtendedProps & TextWithOptionalTooltipProps): React.JSX.Element => (
	<StyledText
		$width={width}
		$centered={centered}
		$italic={italic}
		$inline={inline}
		$lineHeight={lineHeight}
		withTooltip={withTooltip}
		{...dsProps}
	/>
);
