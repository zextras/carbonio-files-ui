/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import * as shell from '@zextras/carbonio-shell-ui';
import { noop } from 'lodash';
import { useHistory } from 'react-router-dom';

import { FILES_APP_ID, FILES_ROUTE } from '../../src/carbonio-files-ui-common/constants';
import { LOGGED_USER, USER_SETTINGS } from '../../src/mocks/constants';

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

export const useUserAccount: typeof shell.useUserAccount = () => LOGGED_USER;
export const getUserAccount: typeof shell.getUserAccount = () => LOGGED_USER;
export const useUserSettings: typeof shell.useUserSettings = () => USER_SETTINGS;
export const report: typeof shell.report = noop;
export const ACTION_TYPES: typeof shell.ACTION_TYPES = {
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
