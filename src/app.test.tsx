/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act } from '@testing-library/react';
import * as shell from '@zextras/carbonio-shell-ui';
import { ACTION_TYPES } from '@zextras/carbonio-shell-ui';

import App from './app';
import { FILES_ROUTE } from './carbonio-files-ui-common/constants';
import { setup } from './carbonio-files-ui-common/tests/utils';
import { FUNCTION_IDS } from './constants';

describe('App', () => {
	describe('User authenticated', () => {
		it('should call addRoute', async () => {
			const addRouteMock = jest.spyOn(shell, 'addRoute');
			setup(<App />);
			await act(async () => {
				await jest.advanceTimersToNextTimerAsync();
			});
			expect(addRouteMock).toHaveBeenCalledWith<Parameters<typeof shell.addRoute>>(
				expect.objectContaining({
					route: FILES_ROUTE,
					position: 500,
					visible: true,
					label: 'Files',
					primaryBar: 'DriveOutline',
					secondaryBar: expect.anything(),
					appView: expect.anything()
				})
			);
		});

		it('should call addSearchView', async () => {
			const addSearchViewMock = jest.spyOn(shell, 'addSearchView');
			setup(<App />);
			await act(async () => {
				await jest.advanceTimersToNextTimerAsync();
			});
			expect(addSearchViewMock).toHaveBeenCalledWith<Parameters<typeof shell.addSearchView>>(
				expect.objectContaining({
					route: FILES_ROUTE,
					component: expect.anything(),
					label: 'Files'
				})
			);
		});

		it('should call registerActions', async () => {
			const registerActionsMock = jest.spyOn(shell, 'registerActions');
			setup(<App />);
			await act(async () => {
				await jest.advanceTimersToNextTimerAsync();
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
			const registerFunctionsMock = jest.spyOn(shell, 'registerFunctions');
			setup(<App />);
			await act(async () => {
				await jest.advanceTimersToNextTimerAsync();
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
		jest.spyOn(shell, 'useAuthenticated').mockReturnValue(false);
		const addRouteMock = jest.spyOn(shell, 'addRoute');
		const addSearchViewMock = jest.spyOn(shell, 'addSearchView');
		const registerActionsMock = jest.spyOn(shell, 'registerActions');
		const registerFunctionsMock = jest.spyOn(shell, 'registerFunctions');
		setup(<App />);
		await act(async () => {
			await jest.advanceTimersToNextTimerAsync();
		});
		expect(addRouteMock).not.toHaveBeenCalled();
		expect(addSearchViewMock).not.toHaveBeenCalled();
		expect(registerActionsMock).not.toHaveBeenCalled();
		expect(registerFunctionsMock).not.toHaveBeenCalled();
	});
});
