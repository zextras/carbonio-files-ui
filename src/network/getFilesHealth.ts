/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
	DOCS_SERVICE_NAME,
	HEALTH_PATH,
	PREVIEW_SERVICE_NAME,
	REST_ENDPOINT
} from '../carbonio-files-ui-common/constants';

export const getFilesHealth = (): Promise<{ previewIsLive: boolean; docsIsLive: boolean }> =>
	fetch(`${REST_ENDPOINT}${HEALTH_PATH}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	})
		.then((response): Promise<{ dependencies: Array<{ name: string; live: boolean }> }> => {
			if (response.ok) {
				return response.json();
			}
			throw new Error('Something went wrong');
		})
		.then(({ dependencies }) => {
			const previewDep = dependencies.find((value) => value.name === PREVIEW_SERVICE_NAME);
			const docsDep = dependencies.find((value) => value.name === DOCS_SERVICE_NAME);
			return { previewIsLive: previewDep?.live ?? false, docsIsLive: docsDep?.live ?? false };
		});
