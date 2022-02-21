/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import {
	goBackHistory,
	pushHistory,
	replaceHistory
} from '@zextras/carbonio-shell-ui';

export type UseNavigationHook = () => {
	navigateToFolder: (id: string) => void;
	navigateTo: (location: string, replace?: boolean) => void;
	navigateBack: () => void;
};

export const useNavigation: UseNavigationHook = () => {

	const navigateToFolder: (id: string) => void = useCallback(
		(id) => {
			pushHistory(`/?folder=${id}`);
		},
		[]
	);

	const navigateTo: (location: string, replace?: boolean) => void = useCallback(
		(location, replace = false) => {
			replace ? replaceHistory(location) : pushHistory(location);
		},
		[]
	);

	const navigateBack: () => void = useCallback(() => {
		goBackHistory();
	}, []);

	return {
		navigateToFolder,
		navigateTo,
		navigateBack
	};
};
