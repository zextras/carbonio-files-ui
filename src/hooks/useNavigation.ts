/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

// eslint-disable-next-line import/no-unresolved
import { goBackHistory, pushHistory, replaceHistory } from '@zextras/carbonio-shell-ui';

import { FILES_ROUTE } from '../carbonio-files-ui-common/constants';

export type UseNavigationHook = () => {
	navigateToFolder: (id: string) => void;
	navigateTo: (location: string, replace?: boolean) => void;
	navigateBack: () => void;
};

export const useNavigation: UseNavigationHook = () => {
	const navigateToFolder: (id: string) => void = useCallback((id) => {
		pushHistory({
			route: FILES_ROUTE,
			path: `/?folder=${id}`
		});
	}, []);

	const navigateTo: (location: string, replace?: boolean) => void = useCallback(
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
