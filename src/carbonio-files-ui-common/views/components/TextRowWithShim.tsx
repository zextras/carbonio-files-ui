/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { Row, Text } from '@zextras/carbonio-design-system';

import { Label } from './Label';
import { ShimmerText } from './StyledComponents';

interface TextRowProps extends React.ComponentPropsWithRef<typeof Row> {
	loading: boolean;
	label: string;
	content: string | number | null | undefined;
	shimmerWidth?: string;
}

export const TextRowWithShim = ({
	loading,
	label,
	content,
	shimmerWidth,
	...rest
}: TextRowProps): JSX.Element | null =>
	((loading || (content !== undefined && content !== null)) && (
		<Row
			orientation="vertical"
			crossAlignment="flex-start"
			padding={{ vertical: 'small' }}
			{...rest}
		>
			<Label>{label}</Label>
			{(loading && <ShimmerText $size="medium" width={shimmerWidth} />) ||
				(content !== undefined && content !== null && <Text size="medium">{content}</Text>)}
		</Row>
	)) ||
	null;
