/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo } from 'react';

import { useReactiveVar } from '@apollo/client';
import { Button, Tooltip } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import { DefaultTheme } from 'styled-components';

import { viewModeVar } from '../../apollo/viewModeVar';
import { VIEW_MODE } from '../../constants';

export const ViewModeComponent = (): React.JSX.Element => {
	const viewMode = useReactiveVar(viewModeVar);
	const [t] = useTranslation();

	const icon = useMemo<keyof DefaultTheme['icons']>(
		() => (viewMode === VIEW_MODE.list ? 'GridOutline' : 'ListOutline'),
		[viewMode]
	);

	const tooltipLabel = useMemo(() => {
		if (VIEW_MODE.list === viewMode) {
			return t('header.iconTooltip.GridLayout', 'Grid layout');
		}
		return t('header.iconTooltip.ListLayout', 'List layout');
	}, [viewMode, t]);

	const switchViewMode = useCallback(() => {
		viewModeVar(viewModeVar() === VIEW_MODE.list ? VIEW_MODE.grid : VIEW_MODE.list);
	}, []);

	return (
		<Tooltip key={`${tooltipLabel}-tooltip`} label={tooltipLabel} placement="top">
			<Button icon={icon} size="large" onClick={switchViewMode} type={'ghost'} color={'text'} />
		</Tooltip>
	);
};
