/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { useLazyQuery } from '@apollo/client';
import { useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { CONFIGS, HTTP_STATUS_CODE } from '../constants';
import { PickIdNodeType } from '../types/common';
import {
	GetConfigsDocument,
	GetConfigsQuery,
	GetConfigsQueryVariables
} from '../types/graphql/types';
import {
	downloadNode as downloadNodeFn,
	downloadMultipleNodes as downloadMultipleNodesFn,
	humanFileSizeFromMB
} from '../utils/utils';

export const useDownloadNodes = (): {
	downloadNode: (id: string, version?: number) => void;
	downloadMultipleNodes: (nodeIds: string[]) => void;
	downloadNodeByType: (node: PickIdNodeType) => void;
} => {
	const createSnackbar = useSnackbar();
	const [t] = useTranslation();

	const [getConfigLazy] = useLazyQuery<GetConfigsQuery, GetConfigsQueryVariables>(
		GetConfigsDocument,
		{
			fetchPolicy: 'cache-first'
		}
	);

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
		getConfigLazy().then((response) => {
			const getConfigs = response.data?.getConfigs;
			if (getConfigs) {
				const maxDownloadSize = getConfigs.find(
					(config) => config?.name === CONFIGS.MAX_DOWNLOAD_SIZE
				)?.value;
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
						autoHideTimeout: 5000
					});
				}
			}
		});
	}, [createSnackbar, getConfigLazy, t]);

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

	const downloadNodeByType = useCallback(
		(node: PickIdNodeType) => {
			switch (node.__typename) {
				case 'File':
					downloadNode(node.id);
					break;
				case 'Folder':
					downloadMultipleNodes([node.id]);
					break;
				default:
					throw new Error('Unsupported node type');
			}
		},
		[downloadMultipleNodes, downloadNode]
	);

	return { downloadNode, downloadMultipleNodes, downloadNodeByType };
};
