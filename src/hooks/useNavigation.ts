/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

export type UseNavigationHook = () => {
	navigateToFolder: (id: string) => void;
	navigateTo: (location: string, replace?: boolean) => void;
	navigateBack: () => void;
};

export const useNavigation: UseNavigationHook = () => {
	// TODO check usage
	const navigate = useNavigate();

	const navigateToFolder = useCallback<(id: string) => void>(
		(id) => {
			navigate({ search: `folder=${id}`, pathname: '..' });
		},
		[navigate]
	);

	const navigateTo = useCallback<(location: string, replace?: boolean) => void>(
		(location, replace = false) => {
			navigate(location, { replace });
		},
		[navigate]
	);

	const navigateBack = useCallback<() => void>(() => {
		navigate(-1);
	}, [navigate]);

	return {
		navigateToFolder,
		navigateTo,
		navigateBack
	};
};
