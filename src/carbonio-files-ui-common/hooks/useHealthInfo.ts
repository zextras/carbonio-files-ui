/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useEffect, useState } from 'react';

import { getFilesHealth } from '../../network/getFilesHealth';

export const healthCache: {
	previewIsLive: boolean | undefined;
	docsIsLive: boolean | undefined;
	healthRequested: boolean;
	healthReceived: boolean;
	healthFailed: boolean;
	cbs: Array<() => void>;
} = {
	previewIsLive: undefined,
	docsIsLive: undefined,
	healthRequested: false,
	healthReceived: false,
	healthFailed: false,
	cbs: []
};

export const useHealthInfo = (): {
	previewIsLive: boolean | undefined;
	docsIsLive: boolean | undefined;
	responseReceived: boolean;
	requestFailed: boolean;
	refreshData: () => void;
	canUsePreview: boolean;
	canUseDocs: boolean;
} => {
	const [state, setState] = useState<{
		previewIsLive: boolean | undefined;
		docsIsLive: boolean | undefined;
		responseReceived: boolean;
		requestFailed: boolean;
	}>({
		previewIsLive: undefined,
		docsIsLive: undefined,
		responseReceived: false,
		requestFailed: false
	});

	const refreshData = useCallback(() => {
		healthCache.healthRequested = true;
		getFilesHealth()
			.then((response) => {
				healthCache.previewIsLive = response.previewIsLive;
				healthCache.docsIsLive = response.docsIsLive;
				healthCache.healthReceived = true;
				setState({
					previewIsLive: response.previewIsLive,
					docsIsLive: response.docsIsLive,
					responseReceived: true,
					requestFailed: false
				});
			})
			.catch(() => {
				healthCache.healthFailed = true;
				healthCache.healthReceived = true;
				setState((prevState) => ({
					...prevState,
					responseReceived: true,
					requestFailed: true
				}));
			})
			.finally(() => {
				healthCache.cbs.forEach((cb) => cb());
			});
	}, []);

	const readCache = useCallback(() => {
		setState({
			previewIsLive: healthCache.previewIsLive,
			docsIsLive: healthCache.docsIsLive,
			responseReceived: healthCache.healthReceived,
			requestFailed: healthCache.healthFailed
		});
	}, []);

	useEffect(() => {
		if (healthCache.healthReceived) {
			readCache();
		} else if (healthCache.healthRequested) {
			healthCache.cbs.push(readCache);
		} else {
			refreshData();
		}
	}, [readCache, refreshData]);

	return {
		...state,
		canUsePreview: state.responseReceived && !state.requestFailed && !!state.previewIsLive,
		canUseDocs: state.responseReceived && !state.requestFailed && !!state.docsIsLive,
		refreshData
	};
};
