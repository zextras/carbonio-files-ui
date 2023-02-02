/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Text, TextProps } from '@zextras/carbonio-design-system';
import { TOptions } from 'i18next';
import { Trans, useTranslation } from 'react-i18next';

interface TransTextProps extends TextProps {
	// i18next Trans props
	i18nKey: string;
	components?: readonly React.ReactNode[] | { readonly [tagName: string]: React.ReactNode };
	count?: number;
	tOptions?: TOptions;
	defaults?: string;
	values?: Record<string, string>;
}

export const TransText: React.FC<TransTextProps> = ({
	weight,
	size,
	color,
	overflow,
	disabled,
	// i18next Trans props
	i18nKey,
	count,
	tOptions,
	values,
	children
}) => {
	const [t] = useTranslation();

	return (
		<Text weight={weight} size={size} color={color} overflow={overflow} disabled={disabled}>
			{/* i18next-extract-disable-next-line */}
			<Trans t={t} i18nKey={i18nKey} count={count} tOptions={tOptions} values={values}>
				{children}
			</Trans>
		</Text>
	);
};
