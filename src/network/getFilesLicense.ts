/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { LICENSE_PATH, REST_ENDPOINT } from '../carbonio-files-ui-common/constants';

export const getFilesLicense = (): Promise<{ licensed: boolean }> =>
	fetch(`${REST_ENDPOINT}${LICENSE_PATH}`, {
		method: 'GET',
		credentials: 'same-origin',
		headers: {
			'Content-Type': 'application/json'
		}
	}).then((response): Promise<{ licensed: boolean }> => {
		if (response.ok) {
			return response.json();
		}
		throw new Error('Something went wrong');
	});
