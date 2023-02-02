/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Icon, Padding, Text, Container, Theme } from '@zextras/carbonio-design-system';

interface ListItemContentProps {
	icon?: string;
	label: string;
	selected?: boolean;
	disabled?: boolean;
	itemIconSize?: React.ComponentPropsWithRef<typeof Icon>['size'];
	itemTextSize?: React.ComponentProps<typeof Text>['size'];
	itemPaddingBetween?: string | keyof Theme['sizes']['padding'] | 0;
}

export const DropdownListItemContent = React.forwardRef<HTMLDivElement, ListItemContentProps>(
	function DropdownListItemContentFn(
		{
			icon,
			label,
			selected,
			disabled,
			itemIconSize = 'medium',
			itemTextSize = 'medium',
			itemPaddingBetween = 'small'
		},
		ref
	): JSX.Element {
		return (
			<Container orientation="horizontal" mainAlignment="flex-start" ref={ref}>
				{icon && (
					<Padding right={itemPaddingBetween}>
						<Icon
							icon={icon}
							size={itemIconSize}
							color={disabled ? 'secondary' : 'text'}
							style={{ pointerEvents: 'none' }}
						/>
					</Padding>
				)}
				<Text
					size={itemTextSize}
					weight={selected ? 'bold' : 'regular'}
					color={disabled ? 'secondary.regular' : 'text'}
					disabled={disabled}
				>
					{label}
				</Text>
			</Container>
		);
	}
);
