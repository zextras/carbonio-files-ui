/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { useHistory } from 'react-router';

function useReplaceHistoryCallbackMock() {
	const history = useHistory();
	return useCallback(
		(location) => {
			if (typeof location === 'string') {
				history.replace(location);
			} else {
				history.replace({ ...location, pathname: location.pathname });
			}
		},
		[history]
	);
}

function usePushHistoryCallbackMock() {
	const history = useHistory();
	return useCallback(
		(location) => {
			if (typeof location === 'string') {
				history.push(location);
			} else {
				history.push({ ...location, pathname: location.pathname });
			}
		},
		[history]
	);
}

function useGoBackHistoryCallbackMock() {
	const history = useHistory();
	return useCallback(() => {
		history.goBack();
	}, [history]);
}

function soapFetchMock(req, body) {
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

export const useUserAccounts = () => [global.mockedUserLogged];
export const useUserSettings = () => global.userSettings;
export const useReplaceHistoryCallback = jest.fn(useReplaceHistoryCallbackMock);
export const usePushHistoryCallback = jest.fn(usePushHistoryCallbackMock);
export const useGoBackHistoryCallback = jest.fn(useGoBackHistoryCallbackMock);
export const soapFetch = jest.fn(soapFetchMock);
export const report = jest.fn();
