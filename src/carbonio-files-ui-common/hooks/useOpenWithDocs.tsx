/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import { useSnackbar, Text } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { useTracker } from '../../hooks/useTracker';
import {
	DOCS_ENDPOINT,
	FILES_APP_ID,
	HTTP_STATUS_CODE,
	OPEN_FILE_PATH,
	TRACKER_EVENT
} from '../constants';

export type OpenWithDocsResponse = { fileOpenUrl: string };

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
	const { capture } = useTracker();
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
				capture(TRACKER_EVENT.openDocumentWithDocs, { app: FILES_APP_ID, success: response.ok });
				if (!response.ok) {
					if (response.status === HTTP_STATUS_CODE.docsFileSizeExceeded) {
						createSnackbar({
							key: new Date().toLocaleString(),
							severity: 'warning',
							label: (
								<>
									<Text color="gray6" size="medium" overflow={'break-word'}>
										{t(
											'snackbar.openWithDocs.error.exceedSizeLimit',
											'The item exceeds the size limit allowed and cannot be opened.'
										)}
									</Text>
									<Text color="gray6" size="medium" overflow={'break-word'}>
										{t(
											'snackbar.openWithDocs.error.pleaseDownload',
											'To view the item, please download it on your device'
										)}
									</Text>
								</>
							),
							replace: true,
							actionLabel: t('snackbar.openWithDocs.error.exceedSizeLimit.actionLabel', 'Ok'),
							disableAutoHide: true
						});
					} else {
						throw new Error('Error code not handled');
					}
				} else {
					const { fileOpenUrl } = (await response.json()) as OpenWithDocsResponse;
					openNodeWithDocs(fileOpenUrl);
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
		[capture, createSnackbar, t]
	);
};
