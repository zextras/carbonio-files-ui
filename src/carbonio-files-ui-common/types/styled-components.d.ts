/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import type { Theme as DSTheme } from '@zextras/carbonio-design-system';

declare module 'styled-components' {
	interface DefaultTheme extends DSTheme {
		icons: DSTheme['icons'] & {
			AnimatedLoader: (props: React.SVGAttributes<SVGSVGElement>) => JSX.Element;
			AnimatedUpload: (props: React.ObjectHTMLAttributes<HTMLObjectElement>) => JSX.Element;
		};
	}
}

declare module 'styled-components/test-utils' {
	import { AnyStyledComponent } from 'styled-components';

	export const find: (
		element: Element,
		styledComponent: AnyStyledComponent
	) => HTMLElementTagNameMap[string] | null;
}
