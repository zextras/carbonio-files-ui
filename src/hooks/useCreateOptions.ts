/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { registerActions, removeActions } from '@zextras/carbonio-shell-ui';

export type CreateOption = Parameters<typeof registerActions>[number];

export type CreateOptionsReturnType = {
	setCreateOptions: (...options: Array<CreateOption>) => void;
	removeCreateOptions: (...ids: Array<string>) => void;
};

export const useCreateOptions = (): CreateOptionsReturnType => {
	const setCreateOptionsCallback = useCallback((...options: Array<CreateOption>) => {
		registerActions(...options);
	}, []);

	const removeCreateOptionsCallback = useCallback((...ids: Array<string>) => {
		removeActions(...ids);
	}, []);

	return {
		setCreateOptions: setCreateOptionsCallback,
		removeCreateOptions: removeCreateOptionsCallback
	};
};
