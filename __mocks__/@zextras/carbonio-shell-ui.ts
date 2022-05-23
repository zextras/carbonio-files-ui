/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Account, AccountSettings, AppRoute } from '@zextras/carbonio-shell-ui';
import { createMemoryHistory, Location } from 'history';

import { FILES_APP_ID, FILES_ROUTE } from '../../src/carbonio-files-ui-common/constants';
import { LOGGED_USER, USER_SETTINGS } from '../../src/mocks/constants';

const history = createMemoryHistory();

function replaceHistoryMock(location: string | Location): void {
	if (typeof location === 'string') {
		history.replace(location);
	} else {
		history.replace({ ...location, pathname: location.pathname });
	}
}

function pushHistoryMock(location: string | Location): void {
	if (typeof location === 'string') {
		history.push(location);
	} else {
		history.push({ ...location, pathname: location.pathname });
	}
}

function goBackHistoryMock(): void {
	history.back();
}

function soapFetchMock(
	req: Record<string, unknown>,
	body: Record<string, unknown>
): Promise<never> {
	return Promise.reject(
		new Error(
			`soap-fetch is not mocked. Mock it in the specific test to make it return wat you want.\n
		Here the params of the request:\n
		Request type: ${req}\n
		Request body: ${body}
		`
		)
	);
}

export const useUserAccounts = (): Account[] => [LOGGED_USER];
export const useUserSettings = (): AccountSettings => USER_SETTINGS;
export const replaceHistory = jest.fn(replaceHistoryMock);
export const pushHistory = jest.fn(pushHistoryMock);
export const hoBackHistory = jest.fn(goBackHistoryMock);
export const soapFetch = jest.fn(soapFetchMock);
export const report = jest.fn();
export const ACTION_TYPES = {
	NEW: 'new'
};
export const getCurrentRoute = jest
	.fn<AppRoute, never>()
	.mockReturnValue({ route: FILES_ROUTE, id: FILES_APP_ID, app: 'carbonio-files-ui' });
