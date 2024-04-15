/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { HEALTH_PATH, REST_ENDPOINT } from '../carbonio-files-ui-common/constants';

const getFilesHealthCompleted = (
	xhr: XMLHttpRequest,
	resolve: (
		value:
			| { previewIsLive: boolean; docsIsLive: boolean }
			| PromiseLike<{ previewIsLive: boolean; docsIsLive: boolean }>
	) => void,
	reject: (reason?: { statusText: string; status: number }) => void
): void => {
	if (xhr.status === 200) {
		const response = JSON.parse(xhr.response);
		const previewDep = (response.dependencies as Array<{ name: string; live: boolean }>).find(
			(value) => value.name === 'carbonio-preview'
		);
		const docsDep = (response.dependencies as Array<{ name: string; live: boolean }>).find(
			(value) => value.name === 'carbonio-docs-connector'
		);
		resolve({ previewIsLive: previewDep?.live ?? false, docsIsLive: docsDep?.live ?? false });
	} else {
		reject({ statusText: xhr.statusText, status: xhr.status });
	}
};

export const getFilesHealth = (): Promise<{ previewIsLive: boolean; docsIsLive: boolean }> =>
	new Promise<{ previewIsLive: boolean; docsIsLive: boolean }>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const url = `${REST_ENDPOINT}${HEALTH_PATH}`;
		xhr.open('GET', url, true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.addEventListener('load', () => {
			if (xhr.readyState === (XMLHttpRequest.DONE || 4)) {
				getFilesHealthCompleted(xhr, resolve, reject);
			}
		});
		xhr.addEventListener('error', () => getFilesHealthCompleted(xhr, resolve, reject));
		xhr.addEventListener('abort', () => getFilesHealthCompleted(xhr, resolve, reject));
		xhr.send();
	});
