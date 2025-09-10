/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { Breadcrumbs as DsBreadcrumbs, getColor, TextProps } from '@zextras/carbonio-design-system';

export const Breadcrumbs = styled(DsBreadcrumbs)<{ $size?: TextProps['size']; $color?: string }>`
	[class^='Text'] {
		font-size: ${({ theme, $size = 'medium' }): string => theme.sizes.font[$size]};

		${({ theme, $color }): string | undefined | ReturnType<typeof css> =>
			$color &&
			css`
				color: ${getColor($color, theme)};
			`};
	}
`;
