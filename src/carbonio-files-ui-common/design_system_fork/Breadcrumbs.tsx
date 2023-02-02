/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Breadcrumbs as DsBreadcrumbs, getColor, TextProps } from '@zextras/carbonio-design-system';
import styled, { css, SimpleInterpolation } from 'styled-components';

export const Breadcrumbs = styled(DsBreadcrumbs)<{ $size?: TextProps['size']; color?: string }>`
	[class^='Text'] {
		font-size: ${({ theme, $size = 'medium' }): string => theme.sizes.font[$size]};

		${({ theme, color }): SimpleInterpolation =>
			color &&
			css`
				color: ${getColor(color, theme)};
			`};
	}
`;
