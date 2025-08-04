/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { HTTP_STATUS_CODE } from '../constants';
import {
	downloadNode as downloadNodeFn,
	downloadMultipleNodes as downloadMultipleNodesFn
} from '../utils/utils';

export const useDownloadNodes = (): {
	downloadNode: (id: string, version?: number) => void;
	downloadMultipleNodes: (nodeIds: string[]) => void;
} => {
	const createSnackbar = useSnackbar();
	const [t] = useTranslation();

	const downloadNode = useCallback(
		(id: string, version?: number) => {
			downloadNodeFn(id, version).then((response) => {
				if (response.ok) {
					createSnackbar({
						key: new Date().toLocaleString(),
						severity: 'info',
						label: t('snackbar.download.start', 'Your download will start soon'),
						replace: true,
						hideButton: true
					});
				}
				if (response.status === HTTP_STATUS_CODE.fileSizeExceeded) {
					createSnackbar({
						label: t('', 'Download size exceeds limit. Reduce selection to download.'),
						severity: 'warning'
					});
				}
			});
		},
		[createSnackbar, t]
	);

	const downloadMultipleNodes = useCallback(
		(nodeIds: string[]) => {
			downloadMultipleNodesFn(nodeIds).then((response) => {
				if (response.ok) {
					createSnackbar({
						key: new Date().toLocaleString(),
						severity: 'info',
						label: t('snackbar.download.start', 'Your download will start soon'),
						replace: true,
						hideButton: true
					});
				}
				if (response.status === HTTP_STATUS_CODE.fileSizeExceeded) {
					createSnackbar({
						label: t('', 'Download size exceeds limit. Reduce selection to download.'),
						severity: 'warning'
					});
				}
			});
		},
		[createSnackbar, t]
	);

	return { downloadNode, downloadMultipleNodes };
};
