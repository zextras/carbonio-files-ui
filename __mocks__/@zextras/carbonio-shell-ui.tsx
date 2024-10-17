/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback } from 'react';

import * as shell from '@zextras/carbonio-shell-ui';
import { useHistory } from 'react-router-dom';

import { FILES_APP_ID, FILES_ROUTE } from '../../src/carbonio-files-ui-common/constants';
import { LOGGED_USER_ACCOUNT } from '../../src/mocks/constants';

export const useReplaceHistoryCallback: typeof shell.useReplaceHistoryCallback = () => {
	const history = useHistory();
	return useCallback(
		(location) => {
			if (typeof location === 'string') {
				history.replace(location);
			} else {
				history.replace(location.path);
			}
		},
		[history]
	);
};

export const usePushHistoryCallback: typeof shell.usePushHistoryCallback = () => {
	const history = useHistory();
	return useCallback(
		(location) => {
			if (typeof location === 'string') {
				history.push(location);
			} else {
				history.push(location.path);
			}
		},
		[history]
	);
};

export const useGoBackHistoryCallback: typeof shell.useGoBackHistoryCallback = () =>
	useHistory().goBack;

export const soapFetch: typeof shell.soapFetch = (req, body) =>
	Promise.reject(
		new Error(
			`soap-fetch is not mocked. Mock it in the specific test to make it return wat you want.\n
		Here the params of the request:\n
		Request type: ${req}\n
		Request body: ${body}
		`
		)
	);

export const useUserAccount: typeof shell.useUserAccount = () => LOGGED_USER_ACCOUNT;
export const getUserAccount: typeof shell.getUserAccount = () => LOGGED_USER_ACCOUNT;
export const report: typeof shell.report = () => '';
export const ACTION_TYPES: Partial<typeof shell.ACTION_TYPES> = {
	NEW: 'new'
};
export const getCurrentRoute: typeof shell.getCurrentRoute = () => ({
	route: FILES_ROUTE,
	id: FILES_APP_ID,
	app: 'carbonio-files-ui'
});

export const getIntegratedFunction: typeof shell.getIntegratedFunction = () => [
	(): void => undefined,
	false
];

export const updatePrimaryBadge: typeof shell.updatePrimaryBadge = () => undefined;

export const EMAIL_VALIDATION_REGEX =
	// eslint-disable-next-line no-control-regex,max-len
	/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

export const registerActions: typeof shell.registerActions = () => undefined;
export const removeActions: typeof shell.removeActions = () => undefined;
export const Spinner: typeof shell.Spinner = () => <>Spinner component stub</>;
