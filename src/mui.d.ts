/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable @typescript-eslint/no-empty-interface */
import { Palette } from '@mui/material';
import { PaletteColor, SimplePaletteColorOptions } from '@mui/material/styles';
import { Theme as DSTheme } from '@zextras/carbonio-design-system';

interface DSPaletteColor {
	[key: keyof DSTheme['palette'][string]]: string;
}

interface DSPalette {
	[key: keyof DSTheme['palette']]: PaletteColor;
}

interface DSPaletteOptions {
	[key: keyof DSTheme['palette']]: SimplePaletteColorOptions;
}

declare module '@mui/material/styles' {
	interface Theme extends DSTheme {}
	// allow configuration using `createTheme`
	interface ThemeOptions extends Partial<Omit<DSTheme, 'breakpoints' | 'windowObj'>> {}

	interface Palette extends DSPalette {}
	interface PaletteOptions extends DSPaletteOptions {}

	interface PaletteColor extends DSPaletteColor {}
	interface SimplePaletteColorOptions extends DSPaletteColor {}
}

declare module '@mui/material/Button' {
	interface ButtonPropsColorOverrides {
		[key: keyof DSTheme['palette']]: true;
	}
	interface ButtonOwnerState {
		backgroundColor: keyof Palette;
	}
}
