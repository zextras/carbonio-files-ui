/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useEffect } from 'react';

import { registerActions } from '@zextras/carbonio-shell-ui';

import { useSelectNodes } from './useSelectNodes';

export const useIntegrations = (): void => {
	const selectNodes = useSelectNodes();

	useEffect(() => {
		registerActions(selectNodes);
	}, [selectNodes]);
};
