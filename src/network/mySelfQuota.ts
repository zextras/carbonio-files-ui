/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { MYSELF_QUOTA_PATH, STORAGES_ENDPOINT } from '../carbonio-files-ui-common/constants';

const getMyQuotaCompleted = (
	xhr: XMLHttpRequest,
	resolve: (
		value: { limit: number; used: number } | PromiseLike<{ limit: number; used: number }>
	) => void,
	reject: (reason?: { statusText: string; status: number }) => void
): void => {
	switch (xhr.status) {
		case 200: {
			const response = JSON.parse(xhr.response);
			resolve({ limit: response.limit, used: response.used });
			break;
		}
		case 400:
		case 404:
		case 413:
		case 500:
		default: {
			reject({ statusText: xhr.statusText, status: xhr.status });
		}
	}
};

export const mySelfQuota = (): Promise<{ limit: number; used: number }> =>
	new Promise<{ limit: number; used: number }>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const url = `${STORAGES_ENDPOINT}${MYSELF_QUOTA_PATH}`;
		xhr.open('GET', url, true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.addEventListener('load', () => {
			if (xhr.readyState === (XMLHttpRequest.DONE || 4)) {
				getMyQuotaCompleted(xhr, resolve, reject);
			}
		});
		xhr.addEventListener('error', () => getMyQuotaCompleted(xhr, resolve, reject));
		xhr.addEventListener('abort', () => getMyQuotaCompleted(xhr, resolve, reject));
		xhr.send();
	});
