/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act } from '@testing-library/react';
import type * as searchUI from '@zextras/carbonio-search-ui';
import * as shell from '@zextras/carbonio-shell-ui';
import { ACTION_TYPES } from '@zextras/carbonio-shell-ui';
import { http, HttpResponse } from 'msw';

import App from './app';
import {
	FILES_APP_ID,
	FILES_ROUTE,
	LICENSE_PATH,
	REST_ENDPOINT
} from './carbonio-files-ui-common/constants';
import { setup } from './carbonio-files-ui-common/tests/utils';
import { FUNCTION_IDS } from './constants';
import { useIsCarbonioCE } from './hooks/useIsCarbonioCE';
import server from './mocks/server';

vi.mock('./hooks/useIsCarbonioCE', () => ({
	useIsCarbonioCE: vi.fn(() => false)
}));

describe('App', () => {
	describe('User authenticated', () => {
		it('should call addRoute', async () => {
			const addRouteMock = vi.spyOn(shell, 'addRoute');
			setup(<App />);
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(addRouteMock).toHaveBeenCalledWith<Parameters<typeof shell.addRoute>>(
				expect.objectContaining({
					id: FILES_APP_ID,
					app: FILES_APP_ID,
					route: FILES_ROUTE,
					label: 'Files',
					position: 500,
					visible: true,
					primaryBar: 'DriveOutline',
					icon: 'DriveOutline',
					secondaryBar: expect.anything(),
					appView: expect.anything()
				})
			);
		});

		it('should call addSearchView', async () => {
			const addSearchViewMock = vi.fn();
			vi.spyOn(shell, 'useIntegratedFunction').mockImplementation((id) => {
				if (id === 'search-add-view') {
					return [addSearchViewMock, true];
				}
				return [(): void => undefined, false];
			});
			setup(<App />);
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(addSearchViewMock).toHaveBeenCalledWith<Parameters<typeof searchUI.addSearchView>>(
				expect.objectContaining({
					route: FILES_ROUTE,
					component: expect.anything(),
					label: 'Files'
				})
			);
		});

		it('should call registerActions', async () => {
			const registerActionsMock = vi.spyOn(shell, 'registerActions');
			setup(<App />);
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(registerActionsMock).toHaveBeenCalledWith<Parameters<typeof shell.registerActions>>(
				expect.objectContaining({
					id: 'upload-file',
					type: ACTION_TYPES.NEW,
					action: expect.anything()
				})
			);
		});

		it('should call registerFunctions', async () => {
			const registerFunctionsMock = vi.spyOn(shell, 'registerFunctions');
			setup(<App />);
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(registerFunctionsMock).toHaveBeenCalledWith<
				Parameters<typeof shell.registerFunctions>
			>(
				{
					id: FUNCTION_IDS.UPLOAD_TO_TARGET_AND_GET_TARGET_ID,
					fn: expect.any(Function)
				},
				{ id: FUNCTION_IDS.GET_LINK, fn: expect.anything() },
				{ id: FUNCTION_IDS.GET_NODE, fn: expect.anything() },
				{ id: FUNCTION_IDS.SELECT_NODES, fn: expect.anything() },
				{ id: FUNCTION_IDS.UPDATE_LINK, fn: expect.anything() }
			);
		});
	});

	it('should not register the route, searchView, actions and functions if the user is not authenticated', async () => {
		vi.spyOn(shell, 'useAuthenticated').mockReturnValue(false);
		const addRouteMock = vi.spyOn(shell, 'addRoute');
		const addSearchViewMock = vi.fn();
		vi.spyOn(shell, 'useIntegratedFunction').mockImplementation((id) => {
			if (id === 'search-add-view') {
				return [addSearchViewMock, true];
			}
			return [(): void => undefined, false];
		});
		const registerActionsMock = vi.spyOn(shell, 'registerActions');
		const registerFunctionsMock = vi.spyOn(shell, 'registerFunctions');
		setup(<App />);
		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		expect(addRouteMock).not.toHaveBeenCalled();
		expect(addSearchViewMock).not.toHaveBeenCalled();
		expect(registerActionsMock).not.toHaveBeenCalled();
		expect(registerFunctionsMock).not.toHaveBeenCalled();
	});

	describe('License', () => {
		it('should call addRoute if the license is valid', async () => {
			const addRouteMock = vi.spyOn(shell, 'addRoute');
			server.use(
				http.get(`${REST_ENDPOINT}${LICENSE_PATH}`, () => HttpResponse.json({ licensed: true }))
			);
			setup(<App />);
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(addRouteMock).toHaveBeenCalledWith(expect.objectContaining({ id: FILES_APP_ID }));
		});

		it('should not register route, searchView, actions and functions if the license is not valid', async () => {
			const addRouteMock = vi.spyOn(shell, 'addRoute');
			const addSearchViewMock = vi.fn();
			vi.spyOn(shell, 'useIntegratedFunction').mockImplementation((id) => {
				if (id === 'search-add-view') {
					return [addSearchViewMock, true];
				}
				return [(): void => undefined, false];
			});
			const registerActionsMock = vi.spyOn(shell, 'registerActions');
			const registerFunctionsMock = vi.spyOn(shell, 'registerFunctions');
			server.use(
				http.get(`${REST_ENDPOINT}${LICENSE_PATH}`, () => HttpResponse.json({ licensed: false }))
			);
			setup(<App />);
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(addRouteMock).not.toHaveBeenCalled();
			expect(addSearchViewMock).not.toHaveBeenCalled();
			expect(registerActionsMock).not.toHaveBeenCalled();
			expect(registerFunctionsMock).not.toHaveBeenCalled();
		});

		it('should call addRoute if the license request fails', async () => {
			const addRouteMock = vi.spyOn(shell, 'addRoute');
			server.use(http.get(`${REST_ENDPOINT}${LICENSE_PATH}`, () => HttpResponse.error()));
			setup(<App />);
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(addRouteMock).toHaveBeenCalledWith(expect.objectContaining({ id: FILES_APP_ID }));
		});

		it('should call addRoute if the license request returns an error status', async () => {
			const addRouteMock = vi.spyOn(shell, 'addRoute');
			server.use(
				http.get(`${REST_ENDPOINT}${LICENSE_PATH}`, () => new HttpResponse(null, { status: 500 }))
			);
			setup(<App />);
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(addRouteMock).toHaveBeenCalledWith(expect.objectContaining({ id: FILES_APP_ID }));
		});

		it('should not request the license and should call addRoute on Carbonio CE', async () => {
			vi.mocked(useIsCarbonioCE).mockReturnValue(true);
			const addRouteMock = vi.spyOn(shell, 'addRoute');
			const licenseRequest = vi.fn();
			server.use(
				http.get(`${REST_ENDPOINT}${LICENSE_PATH}`, () => {
					licenseRequest();
					return HttpResponse.json({ licensed: false });
				})
			);
			setup(<App />);
			await act(async () => {
				await vi.advanceTimersToNextTimerAsync();
			});
			expect(licenseRequest).not.toHaveBeenCalled();
			expect(addRouteMock).toHaveBeenCalledWith(expect.objectContaining({ id: FILES_APP_ID }));
		});
	});
});
