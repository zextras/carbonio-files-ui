/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useContext } from 'react';

import { Tooltip } from '@zextras/carbonio-design-system';

import { NodeAvatarIconContext } from '../../contexts';
import { CheckedAvatar, FileIconPreview, UncheckedAvatar } from './StyledComponents';

interface NodeAvatarIconParams {
	selectionModeActive: undefined | boolean;
	selected: boolean | undefined;
	onClick?: (event: React.SyntheticEvent) => void;
	compact?: boolean;
	disabled?: boolean;
	selectable?: boolean;
	icon: string;
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
	picture
}) => {
	const { tooltipLabel, tooltipDisabled } = useContext(NodeAvatarIconContext);
	return (
		(selectionModeActive &&
			(selected ? (
				<CheckedAvatar
					label=""
					data-testid={`checkedAvatar`}
					icon="Checkmark"
					background="primary"
					onClick={onClick}
				/>
			) : (
				<UncheckedAvatar
					label=""
					background="gray6"
					data-testid={`unCheckedAvatar`}
					onClick={onClick}
				/>
			))) || (
			<Tooltip
				label={tooltipLabel}
				disabled={
					!tooltipLabel ||
					tooltipDisabled === true ||
					(tooltipDisabled !== false &&
						tooltipDisabled({ disabled: !!disabled, selectable: !!selectable }))
				}
			>
				<FileIconPreview
					icon={icon}
					color="gray1"
					background={'gray3'}
					label=""
					onClick={onClick}
					data-testid="file-icon-preview"
					disabled={disabled}
					$compact={compact}
					size={compact ? 'small' : 'medium'}
					picture={picture}
				/>
			</Tooltip>
		)
	);
};
