/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback, useMemo } from 'react';

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

	const limit = useMemo(() => Number(configs[CONFIGS.MAX_DOWNLOAD_SIZE]), [configs]);

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
						key: new Date().toLocaleString(),
						label: t(
							'snackbar.download.error',
							'Download size exceeds the {{limit}} limit. Please reduce items to download',
							{
								replace: {
									limit: humanFileSizeFromMB(limit, t)
								}
							}
						),
						severity: 'warning',
						replace: true,
						disableAutoHide: true
					});
				}
			});
		},
		[createSnackbar, limit, t]
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
						key: new Date().toLocaleString(),
						label: t(
							'snackbar.download.error',
							'Download size exceeds the {{limit}} limit. Please reduce items to download',
							{
								replace: {
									limit: humanFileSizeFromMB(limit, t)
								}
							}
						),
						severity: 'warning',
						replace: true,
						disableAutoHide: true
					});
				}
			});
		},
		[createSnackbar, limit, t]
	);

	return { downloadNode, downloadMultipleNodes };
};
