/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import {
	useGoBackHistoryCallback,
	usePushHistoryCallback,
	useReplaceHistoryCallback
} from '@zextras/carbonio-shell-ui';

import { FILES_ROUTE } from '../carbonio-files-ui-common/constants';

export type UseNavigationHook = () => {
	navigateToFolder: (id: string) => void;
	navigateTo: (location: string, replace?: boolean) => void;
	navigateBack: () => void;
};

export const useNavigation: UseNavigationHook = () => {
	const pushHistory = usePushHistoryCallback();
	const replaceHistory = useReplaceHistoryCallback();
	const goBackHistory = useGoBackHistoryCallback();

	const navigateToFolder = useCallback<(id: string) => void>(
		(id) => {
			pushHistory({
				route: FILES_ROUTE,
				path: `/?folder=${id}`
			});
		},
		[pushHistory]
	);

	const navigateTo = useCallback<(location: string, replace?: boolean) => void>(
		(location, replace = false) => {
			replace
				? replaceHistory({
						route: FILES_ROUTE,
						path: location
					})
				: pushHistory({
						route: FILES_ROUTE,
						path: location
					});
		},
		[pushHistory, replaceHistory]
	);

	const navigateBack = useCallback<() => void>(() => {
		goBackHistory();
	}, [goBackHistory]);

	return {
		navigateToFolder,
		navigateTo,
		navigateBack
	};
};
