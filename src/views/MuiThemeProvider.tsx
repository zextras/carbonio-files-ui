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
	ThemeProvider
} from '@mui/material/styles';
import { TypeText } from '@mui/material/styles/createPalette';
import { deepmerge } from '@mui/utils';
import { Theme as DSTheme } from '@zextras/carbonio-design-system';
import reduce from 'lodash/reduce';

import { PickByValue } from '../carbonio-files-ui-common/types/utils';

export const MuiThemeProvider = ({
	theme: dsTheme,
	children
}: {
	theme: DSTheme;
	children: React.ReactNode | undefined;
}): JSX.Element => {
	const muiTheme = useMemo(() => {
		let themeOverride = createTheme({
			components: {
				MuiChip: {
					styleOverrides: {
						avatar: ({ theme }) => ({
							color: theme.palette.common.white
						})
					}
				}
			},
			palette: {
				...reduce<DSTheme['palette'], Pick<PaletteOptions, keyof DSTheme['palette']>>(
					dsTheme.palette,
					(paletteOptions, paletteEntryValue, paletteEntryKey) => {
						const key = paletteEntryKey as keyof PaletteOptions & keyof DSTheme['palette'];
						const simplePaletteColorObject: SimplePaletteColorOptions & Partial<TypeText> = {
							...paletteEntryValue,
							main: paletteEntryValue.regular
						};
						if (key === 'text') {
							simplePaletteColorObject.primary = paletteEntryValue.regular;
						}
						if (key !== 'currentColor') {
							paletteOptions[key] = simplePaletteColorObject;
						}
						return paletteOptions;
					},
					{} as PaletteOptions
				),
				...reduce<DSTheme['avatarColors'], Pick<PaletteOptions, keyof DSTheme['avatarColors']>>(
					dsTheme.avatarColors,
					(paletteOptions, avatarColorValue, avatarColorKey) => {
						const simplePaletteColorObject: SimplePaletteColorOptions = {
							main: avatarColorValue
						};
						const key = avatarColorKey as keyof PaletteOptions & keyof DSTheme['avatarColors'];
						paletteOptions[key] = simplePaletteColorObject;
						return paletteOptions;
					},
					{}
				)
			}
		});

		themeOverride = createTheme(
			deepmerge(themeOverride, {
				palette: reduce<Required<PaletteOptions>, PaletteOptions>(
					themeOverride.palette,
					(paletteOptions, entryValue, entryKey) => {
						const baseColor =
							typeof entryValue === 'object' &&
							(('main' in entryValue && entryValue.main) ||
								('primary' in entryValue && entryValue.primary));
						if (baseColor && !('contrastText' in entryValue && entryValue.contrastText)) {
							paletteOptions[
								entryKey as keyof PickByValue<PaletteOptions, SimplePaletteColorOptions>
							].contrastText = themeOverride.palette.getContrastText(baseColor);
						}
						return paletteOptions;
					},
					themeOverride.palette
				),
				typography: {
					light: {
						fontSize: '0.875rem',
						fontWeight: themeOverride.typography.fontWeightLight,
						color: themeOverride.palette.text.primary
					}
				}
			})
		);

		return themeOverride;
	}, [dsTheme]);

	return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
};
