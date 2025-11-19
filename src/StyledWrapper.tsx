/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { css, Global } from '@emotion/react';
import { ThemeColorObj, ThemeProvider } from '@zextras/carbonio-design-system';
import type { Theme } from '@zextras/carbonio-design-system';

import { AnimatedLoader } from './carbonio-files-ui-common/views/components/icons/AnimatedLoader';
import { AnimatedUpload } from './carbonio-files-ui-common/views/components/icons/AnimatedUpload';

const themeOverride = (
	theme: Omit<Theme, 'palette'> & {
		palette: Omit<Theme['palette'], 'linked' | 'shared'> & {
			shared?: ThemeColorObj;
			linked?: ThemeColorObj;
		};
	}
): Theme => ({
	...theme,
	palette: {
		shared: {
			regular: '#FFB74D',
			hover: '#FFA21A',
			active: '#FFA21A',
			focus: '#FF9800',
			disabled: '#FFD699'
		},
		linked: {
			regular: '#AB47BC',
			hover: '#8B3899',
			active: '#8B3899',
			focus: '#7A3187',
			disabled: '#DDB4E4'
		},
		...theme.palette
	},
	icons: {
		...theme.icons,
		AnimatedLoader,
		AnimatedUpload: AnimatedUpload as Theme['icons'][string]
	}
});

const globalStyles = css`
	.disable-hover,
	.disable-hover * {
		&:hover {
			background-color: transparent;
		}
	}
`;

const StyledWrapper = ({ children }: React.PropsWithChildren): React.JSX.Element => (
	<ThemeProvider loadDefaultFont={false} extension={themeOverride}>
		<Global styles={globalStyles} />
		{children}
	</ThemeProvider>
);

export default StyledWrapper;
