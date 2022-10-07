/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable @typescript-eslint/no-empty-interface */
import React from 'react';

import { Theme as DSTheme } from '@zextras/carbonio-design-system';

type DsPaletteAndAvatarKeys = keyof DSTheme['palette'] | keyof DSTheme['avatarColors'];

declare module '@mui/material/styles' {
	interface Theme extends DSTheme {}
	// allow configuration using `createTheme`
	interface ThemeOptions
		extends Partial<Omit<DSTheme, 'breakpoints' | 'windowObj' | 'avatarColors'>> {}

	interface Palette extends Record<DsPaletteAndAvatarKeys, PaletteColor> {}
	interface PaletteOptions extends Record<DsPaletteAndAvatarKeys, SimplePaletteColorOptions> {}

	interface PaletteColor extends Record<keyof DSTheme[DsPaletteAndAvatarKeys][string], string> {}
	interface TypeText extends Record<keyof DSTheme[DsPaletteAndAvatarKeys][string], string> {}
	interface SimplePaletteColorOptions
		extends Record<keyof DSTheme[DsPaletteAndAvatarKeys][string], string> {}

	interface TypographyVariants {
		light: React.CSSProperties;
	}

	// allow configuration using `createTheme`
	interface TypographyVariantsOptions {
		light?: React.CSSProperties;
	}
}

declare module '@mui/material/Button' {
	interface ButtonPropsColorOverrides {
		[key: keyof DSTheme[DsPaletteAndAvatarKeys]]: true;
	}
}

declare module '@mui/material/IconButton' {
	interface IconButtonPropsColorOverrides
		extends Record<keyof DSTheme[DsPaletteAndAvatarKeys], true> {}
}

declare module '@mui/material/Chip' {
	interface ChipPropsSizeOverrides {
		large: true;
	}

	interface ChipPropsColorOverrides extends Record<keyof DSTheme[DsPaletteAndAvatarKeys], true> {}
}

declare module '@mui/material/Typography' {
	interface TypographyPropsVariantOverrides {
		light: true;
	}
}
