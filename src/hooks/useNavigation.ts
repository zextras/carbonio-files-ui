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

export type UseNavigationHook = () => {
	navigateToFolder: (id: string) => void;
	navigateTo: (location: string, replace?: boolean) => void;
	navigateBack: () => void;
};

export const useNavigation: UseNavigationHook = () => {
	const pushHistory = usePushHistoryCallback();
	const goBackHistory = useGoBackHistoryCallback();
	const replaceHistory = useReplaceHistoryCallback();

	const navigateToFolder: (id: string) => void = useCallback(
		(id) => {
			pushHistory(`/?folder=${id}`);
		},
		[pushHistory]
	);

	const navigateTo: (location: string, replace?: boolean) => void = useCallback(
		(location, replace = false) => {
			replace ? replaceHistory(location) : pushHistory(location);
		},
		[pushHistory, replaceHistory]
	);

	const navigateBack: () => void = useCallback(() => {
		goBackHistory();
	}, [goBackHistory]);

	return {
		navigateToFolder,
		navigateTo,
		navigateBack
	};
};
