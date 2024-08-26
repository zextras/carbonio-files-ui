/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { reduce } from 'lodash';
import styled, { css, FlattenSimpleInterpolation } from 'styled-components';

export const GridContainer = styled.div<{ sectionsRows: Array<number> }>`
	display: grid;
	row-gap: 0.5rem;
	justify-items: start;
	width: 100%;
	grid-template-columns: minmax(0, auto) auto minmax(0, auto) minmax(0, auto) 6rem;
	${({ sectionsRows }): FlattenSimpleInterpolation => css`
		grid-template-rows: ${reduce(
			sectionsRows,
			(acc, value) => {
				if (value > 0) {
					return `${acc} 1.3125rem repeat(${value}, 2.625rem)`;
				}
				return acc;
			},
			''
		)};
	`}
`;
