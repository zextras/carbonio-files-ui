/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useEffect, useState } from 'react';

import { getFilesHealth } from '../../network/getFilesHealth';

interface HealthState {
	previewIsLive: boolean | undefined;
	docsIsLive: boolean | undefined;
	healthRequested: boolean;
	healthReceived: boolean;
	healthFailed: boolean;
	callbackArray: Array<() => void>;
}

export const healthCache: HealthState = {
	previewIsLive: undefined,
	docsIsLive: undefined,
	healthRequested: false,
	healthReceived: false,
	healthFailed: false,
	callbackArray: []
};

export const useHealthInfo = (): {
	canUsePreview: boolean;
	canUseDocs: boolean;
} => {
	const [state, setState] = useState<Omit<HealthState, 'callbackArray' | 'healthRequested'>>({
		previewIsLive: undefined,
		docsIsLive: undefined,
		healthReceived: false,
		healthFailed: false
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
					healthReceived: true,
					healthFailed: false
				});
			})
			.catch(() => {
				healthCache.healthFailed = true;
				healthCache.healthReceived = true;
				setState((prevState) => ({
					...prevState,
					healthReceived: true,
					healthFailed: true
				}));
			})
			.finally(() => {
				healthCache.callbackArray.forEach((cb) => cb());
			});
	}, []);

	const readCache = useCallback(() => {
		setState({
			previewIsLive: healthCache.previewIsLive,
			docsIsLive: healthCache.docsIsLive,
			healthReceived: healthCache.healthReceived,
			healthFailed: healthCache.healthFailed
		});
	}, []);

	useEffect(() => {
		if (healthCache.healthReceived) {
			readCache();
		} else if (healthCache.healthRequested) {
			healthCache.callbackArray.push(readCache);
		} else {
			refreshData();
		}
	}, [readCache, refreshData]);

	return {
		canUsePreview: state.healthReceived && !state.healthFailed && !!state.previewIsLive,
		canUseDocs: state.healthReceived && !state.healthFailed && !!state.docsIsLive
	};
};
