/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { Component, useCallback } from 'react';

// eslint-disable-next-line import/no-unresolved
import {
	ActionFactory,
	registerActions,
	RuntimeAppData as ShellRuntimeAppData
} from '@zextras/carbonio-shell-ui';

// TODO: remove these types when implemented in shell
export type SharedAction = {
	id: string;
	label: string;
	icon: string | Component;
	click: (event?: React.SyntheticEvent) => void;
	disabled?: boolean;
	getDisabledStatus?: (...args: unknown[]) => boolean;
};

type RuntimeAppData = ShellRuntimeAppData & {
	newButton?: {
		primary?: SharedAction;
		secondaryItems?: Array<SharedAction>;
	};
};

export type CreateOptionsContent = {
	createOptions?: Array<{ id: string; action: ActionFactory<unknown>; type: string }>;
	setCreateOptions: (
		appCreateOptions: Array<{ id: string; action: ActionFactory<unknown>; type: string }>
	) => void;
};

export const useCreateOptions = (): {
	setCreateOptions: (
		...options: Array<{ id: string; action: ActionFactory<unknown>; type: string }>
	) => void;
} => {
	const setCreateOptionsCallback = useCallback(
		(...options: Array<{ id: string; action: ActionFactory<unknown>; type: string }>) => {
			registerActions(...options);
		},
		[]
	);
	return {
		setCreateOptions: setCreateOptionsCallback
	};
};
