/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { ThemeProvider } from '@zextras/carbonio-design-system';
import type { Theme as DSTheme } from '@zextras/carbonio-design-system';
import { createGlobalStyle, DefaultTheme } from 'styled-components';

import { AnimatedLoader } from './carbonio-files-ui-common/views/components/icons/AnimatedLoader';
import { AnimatedUpload } from './carbonio-files-ui-common/views/components/icons/AnimatedUpload';

const themeOverride = (theme: DSTheme): DefaultTheme => ({
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
		AnimatedUpload
	} as DefaultTheme['icons'] // FIXME check how to remove this cast
});

const GlobalStyle = createGlobalStyle`
  .disable-hover, .disable-hover * {
	  &:hover {
		  background-color: transparent;
	  }
  }
`;

const StyledWrapper: React.FC = ({ children }) => (
	<ThemeProvider loadDefaultFont={false} extension={themeOverride}>
		<GlobalStyle />
		{children}
	</ThemeProvider>
);

export default StyledWrapper;
