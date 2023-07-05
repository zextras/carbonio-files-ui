/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { useHistory } from 'react-router-dom';

import { UseNavigationHook } from './hooks/useNavigation';

const useNavigationHookMock: UseNavigationHook = () => {
	const history = useHistory();

	const navigateToFolder = useCallback<ReturnType<UseNavigationHook>['navigateToFolder']>(
		(id: string) => {
			history.push(`/?folder=${id}`);
		},
		[history]
	);

	const navigateTo = useCallback<ReturnType<UseNavigationHook>['navigateTo']>(
		(location, replace = false) => {
			replace ? history.replace(location) : history.push(location);
		},
		[history]
	);

	const navigateBack = useCallback<ReturnType<UseNavigationHook>['navigateBack']>(() => {
		history.goBack();
	}, [history]);

	return {
		navigateToFolder,
		navigateBack,
		navigateTo
	};
};

jest.mock('./hooks/useNavigation', () => ({
	useNavigation: useNavigationHookMock
}));
