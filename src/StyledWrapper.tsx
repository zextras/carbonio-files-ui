/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { ThemeProvider } from '@zextras/carbonio-design-system';
import { createGlobalStyle } from 'styled-components';

import { AnimatedLoader } from './carbonio-files-ui-common/views/components/icons/AnimatedLoader';
import { AnimatedUpload } from './carbonio-files-ui-common/views/components/icons/AnimatedUpload';

interface ThemeObject {
	sizes: ThemeObject & { font: ThemeObject };
	icons: ThemeObject;
	[key: string]: string | React.ReactNode | ThemeObject;
}

const themeOverride = (theme: ThemeObject): ThemeObject => ({
	...theme,
	sizes: {
		...theme.sizes,
		// add extralarge size, but use the default one if implemented in the main theme
		font: { extralarge: '20px', ...theme.sizes.font }
	},
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
		{children}
	</ThemeProvider>
);

export default StyledWrapper;
