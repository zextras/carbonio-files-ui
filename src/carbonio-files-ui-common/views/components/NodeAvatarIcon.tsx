/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useContext } from 'react';

import { Tooltip } from '@zextras/carbonio-design-system';

import { FileIconPreview } from './StyledComponents';
import { NodeAvatarIconContext } from '../../contexts';

interface NodeAvatarIconParams {
	selectionModeActive: undefined | boolean;
	selected: boolean | undefined;
	onClick?: (event: React.SyntheticEvent) => void;
	compact?: boolean;
	disabled?: boolean;
	selectable?: boolean;
	icon: string;
	color?: string;
	picture?: string;
}

export const NodeAvatarIcon: React.VFC<NodeAvatarIconParams> = ({
	selectionModeActive,
	selected,
	onClick,
	compact,
	disabled,
	selectable,
	icon,
	color,
	picture
}) => {
	const { tooltipLabel, tooltipDisabled } = useContext(NodeAvatarIconContext);

	return (
		<Tooltip
			label={tooltipLabel}
			disabled={
				!tooltipLabel ||
				tooltipDisabled === true ||
				(tooltipDisabled !== false &&
					tooltipDisabled({ disabled: !!disabled, selectable: !!selectable })) ||
				selectionModeActive
			}
		>
			<FileIconPreview
				icon={icon}
				color={color}
				background={'gray3'}
				label=""
				onClick={onClick}
				data-testid={selectionModeActive ? 'file-icon-selecting' : 'file-icon-preview'}
				disabled={disabled}
				$compact={compact}
				size={compact ? 'small' : 'medium'}
				picture={picture}
				selecting={selectionModeActive}
				selected={selected}
			/>
		</Tooltip>
	);
};
