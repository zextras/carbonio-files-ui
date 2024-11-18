/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Text, TextProps } from '@zextras/carbonio-design-system';
import { Trans, useTranslation } from 'react-i18next';

type TransTextProps = Pick<TextProps, 'weight' | 'size' | 'color' | 'overflow' | 'disabled'> &
	React.ComponentProps<typeof Trans>;

export const TransText = ({
	weight,
	size,
	color,
	overflow,
	disabled,
	// i18next Trans props
	children,
	...rest
}: TransTextProps): React.JSX.Element => {
	const [t] = useTranslation();

	return (
		<Text weight={weight} size={size} color={color} overflow={overflow} disabled={disabled}>
			<Trans t={t} {...rest}>
				{children}
			</Trans>
		</Text>
	);
};
