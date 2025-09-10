/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { css } from '@emotion/react';
import styled from '@emotion/styled';
import {
	Container,
	Divider,
	getColor,
	Icon,
	LabelFactoryProps,
	Padding,
	Row,
	Text,
	Tooltip
} from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { EMPTY_ITEM } from '../../../../../constants';

const ContainerEl = styled(Container)<{ $focus: boolean; $disabled: boolean }>`
	transition: background 0.2s ease-out;
	cursor: ${({ $disabled }): string => ($disabled ? 'default' : 'pointer')};
	${({ $disabled, theme, background }): ReturnType<typeof css> | false =>
		!$disabled &&
		css`
			&:hover {
				background: ${getColor(`${background}.hover`, theme)};
			}
		`};
	${({ $focus, $disabled, theme, background }): ReturnType<typeof css> | false =>
		$focus &&
		!$disabled &&
		css`
			background: ${getColor(`${background}.focus`, theme)};
		`};
`;

const CustomText = styled(Text)`
	min-height: 1.167em;
`;

const CustomIcon = styled(Icon)`
	align-self: center;
	pointer-events: none;
`;

const INPUT_DIVIDER_COLOR = 'gray3';

const Label = styled(Text)<{ $selectedAndValid: boolean }>`
	position: absolute;
	top: ${({ $selectedAndValid, theme }): string =>
		$selectedAndValid ? `calc(${theme.sizes.padding.small} - 0.0625rem)` : '50%'};
	left: ${({ theme }): string => theme.sizes.padding.large};
	transform: translateY(${({ $selectedAndValid }): string => ($selectedAndValid ? '0' : '-50%')});
	transition: 150ms ease-out;
`;

export const CustomCollaborationLinkSelect = ({
	selected,
	label,
	open,
	focus,
	background,
	disabled
}: LabelFactoryProps): React.JSX.Element => {
	const [t] = useTranslation();
	const hasValidSelection = selected.some((item) => item.value !== EMPTY_ITEM.value);
	const selectedLabels = useMemo(
		() =>
			selected
				.filter((item) => item.value !== EMPTY_ITEM.value)
				.map((item) => item.label)
				.join(', '),
		[selected]
	);

	return (
		<>
			<Tooltip
				disabled={!disabled}
				label={t(
					'collaborationLinks.maximumLinks.tooltip',
					"You've reached the maximum number of links. Revoke one to create a new one."
				)}
			>
				<ContainerEl
					orientation="horizontal"
					width="fill"
					crossAlignment="flex-end"
					mainAlignment="space-between"
					borderRadius="half"
					padding={{
						horizontal: 'large',
						vertical: 'small'
					}}
					background={background}
					$focus={focus}
					$disabled={disabled}
				>
					<Row takeAvailableSpace mainAlignment="unset">
						<Padding top="medium" width="100%">
							<CustomText
								size="medium"
								color={disabled ? 'secondary' : 'text'}
								data-testid={'collaboration-link-select-label'}
							>
								{selectedLabels}
							</CustomText>
						</Padding>
						<Label
							$selectedAndValid={hasValidSelection}
							size={hasValidSelection ? 'small' : 'medium'}
							color={(disabled && 'gray2') || ((open || focus) && 'primary') || 'secondary'}
						>
							{label}
						</Label>
					</Row>
					<CustomIcon
						size="medium"
						icon={open ? 'ArrowUp' : 'ArrowDown'}
						color={(disabled && 'gray2') || ((open || focus) && 'primary') || 'secondary'}
					/>
				</ContainerEl>
			</Tooltip>
			<Divider color={(open || focus) && !disabled ? 'primary' : INPUT_DIVIDER_COLOR} />
		</>
	);
};
