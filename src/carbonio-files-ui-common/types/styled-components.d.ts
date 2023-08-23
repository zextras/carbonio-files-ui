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
			AnimatedLoader: (props: React.SVGAttributes<SVGSVGElement>) => React.JSX.Element;
			AnimatedUpload: (props: React.ObjectHTMLAttributes<HTMLObjectElement>) => React.JSX.Element;
		};
		palette: DSTheme['palette'] & {
			shared: DSTheme['palette'][keyof DSTheme['palette']];
			linked: DSTheme['palette'][keyof DSTheme['palette']];
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
