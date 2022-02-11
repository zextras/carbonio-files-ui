/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import {
	// useGoBackHistoryCallback,
	// usePushHistoryCallback,
	// useReplaceHistoryCallback,
	getBridgedFunctions
	// eslint-disable-next-line import/no-unresolved
} from '@zextras/carbonio-shell-ui';

export type UseNavigationHook = () => {
	navigateToFolder: (id: string) => void;
	navigateTo: (location: string, replace?: boolean) => void;
	navigateBack: () => void;
};

export const useNavigation: UseNavigationHook = () => {
	// const pushHistory = usePushHistoryCallback();
	// const goBackHistory = useGoBackHistoryCallback();
	// const replaceHistory = useReplaceHistoryCallback();

	const navigateToFolder: (id: string) => void = useCallback((id) => {
		// pushHistory(`/?folder=${id}`);
		getBridgedFunctions().historyPush(`/?folder=${id}`);
	}, []);

	const navigateTo: (location: string, replace?: boolean) => void = useCallback(
		(location, replace = false) => {
			const { historyPush, historyReplace } = getBridgedFunctions();
			replace ? historyReplace(location) : historyPush(location);
			// replace ? replaceHistory(location) : pushHistory(location);
		},
		[]
	);

	const navigateBack: () => void = useCallback(() => {
		getBridgedFunctions().historyGoBack();
		// TODO: remove ts comments when shell is updated
		// goBackHistory();
	}, []);

	return {
		navigateToFolder,
		navigateTo,
		navigateBack
	};
};
