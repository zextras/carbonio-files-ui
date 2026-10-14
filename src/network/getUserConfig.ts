/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { UserConfig } from '../carbonio-files-ui-common/apollo/userConfigVar';
import { CONFIG_PATH, REST_ENDPOINT } from '../carbonio-files-ui-common/constants';

export const getUserConfig = (): Promise<UserConfig> =>
	fetch(`${REST_ENDPOINT}${CONFIG_PATH}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	}).then((response): Promise<UserConfig> => {
		if (response.ok) {
			return response.json();
		}
		throw new Error('Something went wrong');
	});
