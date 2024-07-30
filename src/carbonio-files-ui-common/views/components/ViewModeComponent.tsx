/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo } from 'react';

import { useReactiveVar } from '@apollo/client';
import { IconButton, Tooltip } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import { DefaultTheme } from 'styled-components';

import { viewModeVar } from '../../apollo/viewModeVar';
import { VIEW_MODE } from '../../constants';

export const ViewModeComponent = (): React.JSX.Element => {
	const viewMode = useReactiveVar(viewModeVar);
	const [t] = useTranslation();

	const iconButtonIconProps = useMemo<keyof DefaultTheme['icons']>(
		() => (viewMode === VIEW_MODE.list ? 'GridOutline' : 'ListOutline'),
		[viewMode]
	);

	const tooltipLabel = useMemo(() => {
		if (VIEW_MODE.list === viewMode) {
			return t('sortingDropdown.icon.tooltip.OrderSizeAscending', 'Ascending order by size');
		}
		return t('sortingDropdown.icon.tooltip.OrderSizeAscending', 'Ascending order by size');
	}, [viewMode, t]);

	const switchViewMode = useCallback(() => {
		viewModeVar(viewModeVar() === VIEW_MODE.list ? VIEW_MODE.grid : VIEW_MODE.list);
	}, []);

	return (
		<Tooltip label={tooltipLabel} placement="top">
			<IconButton icon={iconButtonIconProps} size="large" onClick={switchViewMode} />
		</Tooltip>
	);
};
