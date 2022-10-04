/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { createTheme, ThemeProvider } from '@zextras/carbonio-design-system';
import { createGlobalStyle, DefaultTheme } from 'styled-components';

import { AnimatedLoader } from '../carbonio-files-ui-common/views/components/icons/AnimatedLoader';
import { AnimatedUpload } from '../carbonio-files-ui-common/views/components/icons/AnimatedUpload';
import { MuiThemeProvider } from './MuiThemeProvider';

const baseTheme = createTheme({});

const extendedTheme = {
	...baseTheme,
	icons: {
		...baseTheme.icons,
		AnimatedLoader,
		AnimatedUpload
	}
};

const themeOverride = (theme: DefaultTheme): DefaultTheme => ({
	...theme,
	icons: {
		...theme.icons,
		AnimatedLoader,
		AnimatedUpload
	}
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
		<MuiThemeProvider theme={extendedTheme}>{children}</MuiThemeProvider>
	</ThemeProvider>
);

export default StyledWrapper;
