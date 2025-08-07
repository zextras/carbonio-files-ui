/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { CONFIGS, HTTP_STATUS_CODE } from '../constants';
import {
	downloadNode as downloadNodeFn,
	downloadMultipleNodes as downloadMultipleNodesFn,
	humanFileSizeFromMB
} from '../utils/utils';
import { useGetConfigsQuery } from './graphql/queries/useGetConfigsQuery';

export const useDownloadNodes = (): {
	downloadNode: (id: string, version?: number) => void;
	downloadMultipleNodes: (nodeIds: string[]) => void;
} => {
	const createSnackbar = useSnackbar();
	const [t] = useTranslation();
	const configs = useGetConfigsQuery();

	const successSnackbarCallback = useCallback(() => {
		createSnackbar({
			key: new Date().toLocaleString(),
			severity: 'info',
			label: t('snackbar.download.start', 'Your download will start soon'),
			replace: true,
			hideButton: true
		});
	}, [createSnackbar, t]);

	const errorSnackbarCallback = useCallback(() => {
		const maxDownloadSize = configs[CONFIGS.MAX_DOWNLOAD_SIZE];
		if (maxDownloadSize != null) {
			createSnackbar({
				key: new Date().toLocaleString(),
				label: t(
					'snackbar.download.error',
					'Download size exceeds the {{limit}} limit. Please reduce items to download',
					{
						replace: {
							limit: humanFileSizeFromMB(Number(maxDownloadSize), t)
						}
					}
				),
				severity: 'warning',
				replace: true,
				disableAutoHide: true
			});
		}
	}, [configs, createSnackbar, t]);

	const genericErrorSnackbar = useCallback(() => {
		createSnackbar({
			key: new Date().toLocaleString(),
			severity: 'warning',
			label: t('errorCode.code', 'Something went wrong', { context: 'Generic' }),
			replace: true,
			hideButton: true
		});
	}, [createSnackbar, t]);

	const downloadNode = useCallback(
		(id: string, version?: number) => {
			downloadNodeFn(id, version).then((response) => {
				if (response.ok) {
					successSnackbarCallback();
				} else if (response.status === HTTP_STATUS_CODE.fileSizeExceeded) {
					errorSnackbarCallback();
				} else {
					genericErrorSnackbar();
				}
			});
		},
		[errorSnackbarCallback, genericErrorSnackbar, successSnackbarCallback]
	);

	const downloadMultipleNodes = useCallback(
		(nodeIds: string[]) => {
			downloadMultipleNodesFn(nodeIds).then((response) => {
				if (response.ok) {
					successSnackbarCallback();
				} else if (response.status === HTTP_STATUS_CODE.fileSizeExceeded) {
					errorSnackbarCallback();
				} else {
					genericErrorSnackbar();
				}
			});
		},
		[errorSnackbarCallback, genericErrorSnackbar, successSnackbarCallback]
	);

	return { downloadNode, downloadMultipleNodes };
};
