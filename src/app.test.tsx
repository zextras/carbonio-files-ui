/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import * as shell from '@zextras/carbonio-shell-ui';
import { ACTION_TYPES } from '@zextras/carbonio-shell-ui';

import App from './app';
import { FILES_ROUTE } from './carbonio-files-ui-common/constants';
import { setup } from './carbonio-files-ui-common/tests/utils';

describe('App', () => {
	describe('User authenticated', () => {
		it('should call addRoute', () => {
			const addRouteMock = jest.spyOn(shell, 'addRoute');
			setup(<App />);
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

		it('should call addSearchView', () => {
			const addSearchViewMock = jest.spyOn(shell, 'addSearchView');
			setup(<App />);
			expect(addSearchViewMock).toHaveBeenCalledWith<Parameters<typeof shell.addSearchView>>(
				expect.objectContaining({
					route: FILES_ROUTE,
					component: expect.anything(),
					label: 'Files'
				})
			);
		});

		it('should call registerActions', () => {
			const registerActionsMock = jest.spyOn(shell, 'registerActions');
			setup(<App />);
			expect(registerActionsMock).toHaveBeenCalledWith<Parameters<typeof shell.registerActions>>(
				expect.objectContaining({
					id: 'upload-file',
					type: ACTION_TYPES.NEW,
					action: expect.anything()
				})
			);
		});
	});

	it('should not register the route, searchView and actions if the user is not authenticated', () => {
		jest.spyOn(shell, 'useAuthenticated').mockReturnValue(false);
		const addRouteMock = jest.spyOn(shell, 'addRoute');
		const addSearchViewMock = jest.spyOn(shell, 'addSearchView');
		const registerActionsMock = jest.spyOn(shell, 'registerActions');
		setup(<App />);
		expect(addRouteMock).not.toHaveBeenCalled();
		expect(addSearchViewMock).not.toHaveBeenCalled();
		expect(registerActionsMock).not.toHaveBeenCalled();
	});
});
