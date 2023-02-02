/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { Padding, Text, TextProps } from '@zextras/carbonio-design-system';

interface LabelProps {
	children: TextProps['children'];
}

export const Label = ({ children }: LabelProps): JSX.Element => (
	<Padding bottom="small">
		<Text color="secondary" size="small">
			{children}
		</Text>
	</Padding>
);
