/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { DOCS_ENDPOINT, HTTP_STATUS_CODE, OPEN_FILE_PATH } from '../constants';

export type OpenWithDocsResponse = { url: string };

const docsTabMap: { [url: string]: Window } = {};

const openNodeWithDocs = (url: string): void => {
	if (docsTabMap[url] == null || docsTabMap[url]?.closed) {
		docsTabMap[url] = window.open(url, url) as Window;
	} else {
		docsTabMap[url].focus();
	}
};

type OpenWithDocsFn = (id: string, version?: number) => Promise<void>;

export const useOpenWithDocs = (): OpenWithDocsFn => {
	const createSnackbar = useSnackbar();
	const [t] = useTranslation();
	return useCallback(
		async (id, version) => {
			try {
				const response = await fetch(
					`${DOCS_ENDPOINT}${OPEN_FILE_PATH}/${encodeURIComponent(id)}${
						version ? `?version=${version}` : ''
					}`,
					{
						method: 'GET',
						headers: {
							'Content-Type': 'application/json'
						}
					}
				);
				if (!response.ok) {
					if (response.status === HTTP_STATUS_CODE.docsFileSizeExceeded) {
						createSnackbar({
							key: new Date().toLocaleString(),
							severity: 'warning',
							label: t(
								'snackbar.openWithDocs.error.exceedSizeLimit',
								'The item exceeds the size limit allowed and cannot be opened. To view the item, please download it on your device'
							),
							replace: true,
							actionLabel: t('snackbar.openWithDocs.error.exceedSizeLimit.actionLabel', 'Ok'),
							disableAutoHide: true
						});
					} else {
						throw new Error('Error code not handled');
					}
				} else {
					const { url } = (await response.json()) as OpenWithDocsResponse;
					openNodeWithDocs(url);
				}
			} catch (error) {
				createSnackbar({
					key: new Date().toLocaleString(),
					severity: 'warning',
					label: t('errorCode.code', 'Something went wrong', { context: 'Generic' }),
					replace: true,
					hideButton: true
				});
			}
		},
		[createSnackbar, t]
	);
};
