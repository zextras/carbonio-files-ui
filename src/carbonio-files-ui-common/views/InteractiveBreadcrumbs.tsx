/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { BreadcrumbsProps, getColor } from '@zextras/carbonio-design-system';
import { map } from 'lodash';
import styled from 'styled-components';

import { Breadcrumbs } from '../design_system_fork/Breadcrumbs';

const CustomBreadcrumbs = styled(Breadcrumbs)`
	.breadcrumbCrumb {
		border-radius: 0.125rem;
		cursor: pointer;
		&:hover {
			background-color: ${getColor('gray5.hover')};
		}
		&.currentCrumb {
			cursor: default;
			&:hover {
				background-color: inherit;
			}
		}
	}

	.breadcrumbCollapser {
		border-radius: 0.125rem;
		&:active,
		&.active {
			background-color: ${getColor('gray4.active')};
		}
		&:hover {
			background-color: ${getColor('gray4.hover')};
		}
	}
`;

export const InteractiveBreadcrumbs: React.VFC<BreadcrumbsProps> = ({ crumbs, ...props }) => {
	const interactiveCrumbs = useMemo(
		() =>
			map(crumbs, (crumb) => ({
				...crumb,
				className: `${crumb.className ? crumb.className : ''} breadcrumbCrumb ${
					!crumb.click ? 'currentCrumb' : ''
				}`
			})),
		[crumbs]
	);
	return <CustomBreadcrumbs crumbs={interactiveCrumbs} {...props} />;
};
