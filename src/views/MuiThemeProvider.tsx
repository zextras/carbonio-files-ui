/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useMemo } from 'react';

import {
	createTheme,
	PaletteOptions,
	SimplePaletteColorOptions,
	ThemeOptions,
	ThemeProvider
} from '@mui/material/styles';
import { Theme as DSTheme } from '@zextras/carbonio-design-system';
import reduce from 'lodash/reduce';

export const MuiThemeProvider = ({
	theme: dsTheme,
	children
}: {
	theme: DSTheme;
	children: React.ReactNode | undefined;
}): JSX.Element => {
	const muiTheme = useMemo(() => {
		const themeOptions: ThemeOptions = {
			components: {
				MuiIconButton: {
					styleOverrides: {
						root: ({ ownerState: { backgroundColor }, theme }) =>
							backgroundColor && {
								backgroundColor: theme.palette[backgroundColor]
							}
					}
				}
			}
		};

		return createTheme(themeOptions, {
			palette: reduce<DSTheme['palette'], PaletteOptions>(
				dsTheme.palette,
				(paletteOptions, paletteEntryValue, paletteEntryKey) => {
					const simplePaletteColorObject: SimplePaletteColorOptions = {
						...paletteEntryValue,
						main: paletteEntryValue.regular
					};
					const key = paletteEntryKey as keyof PaletteOptions & keyof DSTheme['palette'];
					paletteOptions[key] = simplePaletteColorObject;
					return paletteOptions;
				},
				{}
			)
		});
	}, [dsTheme]);

	return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
};
