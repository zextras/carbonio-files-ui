/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useReactiveVar } from '@apollo/client';
import { noop } from 'lodash';

import { getUserConfig } from '../../network/getUserConfig';
import { userConfigVar } from '../apollo/userConfigVar';
import { SHARES_ENABLED_CONFIG_KEY } from '../constants';

export const userConfigCache = {
	requested: false
};

export function loadUserConfig(): void {
	if (userConfigCache.requested) {
		return;
	}
	userConfigCache.requested = true;
	getUserConfig()
		.then((config) => {
			userConfigVar(config);
		})
		.catch(noop);
}

export function useSharesEnabled(): boolean {
	const userConfig = useReactiveVar(userConfigVar);
	return userConfig[SHARES_ENABLED_CONFIG_KEY]?.toLowerCase() !== 'false';
}
