/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { registerActions, removeActions } from '@zextras/carbonio-shell-ui';
import type { NewAction as ShellNewAction } from '@zextras/carbonio-shell-ui';

export type NewAction = ShellNewAction;

export type CreateOption = Parameters<typeof registerActions>[number];

export type CreateOptionsReturnType = {
	setCreateOptions: typeof registerActions;
	removeCreateOptions: (...ids: Array<string>) => void;
};

export const useCreateOptions = (): CreateOptionsReturnType => {
	const setCreateOptionsCallback = useCallback<typeof registerActions>((...options) => {
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
