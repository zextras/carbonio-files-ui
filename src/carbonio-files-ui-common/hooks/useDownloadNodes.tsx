/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import {
	DOWNLOAD_MULTIPLE_PATH,
	DOWNLOAD_PATH,
	HTTP_STATUS_CODE,
	REST_ENDPOINT
} from '../constants';

export const useDownloadNodes = (): {
	downloadNode: (id: string, nameNode: string, version?: number) => void;
	downloadMultipleNodes: (nodeIds: string[], nameZip?: string) => void;
} => {
	const createSnackbar = useSnackbar();
	const [t] = useTranslation();

	const downloadNode = async (id: string, nameNode: string, version?: number): Promise<void> => {
		if (id) {
			const url = `${REST_ENDPOINT}${DOWNLOAD_PATH}/${encodeURIComponent(id)}${
				version ? `/${version}` : ''
			}`;
			try {
				const response = await fetch(url);
				if (response.status === HTTP_STATUS_CODE.fileSizeExceeded) {
					createSnackbar({
						label: t('', 'Download size exceeds limit. Reduce selection to download.'),
						severity: 'warning'
					});
					return;
				}

				// this is to take the name of the node and its extension,
				// e.g., node_downloaded.odt
				const disposition = response.headers.get('Content-Disposition');
				let filename = nameNode;
				if (disposition) {
					const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/i);
					if (match && match[1]) {
						filename = decodeURIComponent(match[1]);
					}
				}

				const blob = await response.blob();
				const urlBlob = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = urlBlob;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				a.remove();
				URL.revokeObjectURL(urlBlob);
				createSnackbar({
					key: new Date().toLocaleString(),
					severity: 'info',
					label: t('snackbar.download.start', 'Your download will start soon'),
					replace: true,
					hideButton: true
				});
			} catch (error) {
				console.error('Download error: ', error);
			}
		}
	};

	const downloadMultipleNodes = useCallback(
		async (nodeIds: string[], nameZip?: string) => {
			const url = `${REST_ENDPOINT}${DOWNLOAD_MULTIPLE_PATH}`;
			const params = new URLSearchParams();
			params.append('nodeIds', JSON.stringify(nodeIds));

			try {
				const response = await fetch(url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					body: params.toString()
				});

				if (response.status === HTTP_STATUS_CODE.fileSizeExceeded) {
					createSnackbar({
						label: t('', 'Download size exceeds limit. Reduce selection to download.'),
						severity: 'warning'
					});
					return;
				}

				const blob = await response.blob();
				const urlBlob = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = urlBlob;
				a.download = nameZip ?? 'file_nodes.zip';
				document.body.appendChild(a);
				a.click();
				a.remove();
				URL.revokeObjectURL(urlBlob);
				createSnackbar({
					key: new Date().toLocaleString(),
					severity: 'info',
					label: t('snackbar.download.start', 'Your download will start soon'),
					replace: true,
					hideButton: true
				});
			} catch (error) {
				console.error('Download error: ', error);
			}
		},
		[createSnackbar, t]
	);

	return { downloadNode, downloadMultipleNodes };
};
