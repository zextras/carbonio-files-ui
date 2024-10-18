/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { act } from '@testing-library/react';
import { CreateSnackbarFn, CreateSnackbarFnArgs, Text } from '@zextras/carbonio-design-system';
import { http, HttpResponse } from 'msw';

import { OpenWithDocsResponse, useOpenWithDocs } from './useOpenWithDocs';
import server from '../../mocks/server';
import { DOCS_ENDPOINT, HTTP_STATUS_CODE, OPEN_FILE_PATH } from '../constants';
import { setupHook } from '../tests/utils';

let mockCreateSnackbar: jest.MockedFn<CreateSnackbarFn>;

jest.mock('@zextras/carbonio-design-system', () => ({
	...jest.requireActual('@zextras/carbonio-design-system'),
	useSnackbar: (): CreateSnackbarFn => mockCreateSnackbar
}));

beforeEach(() => {
	mockCreateSnackbar = jest.fn();
});

describe('useOpenWithDocs hook', () => {
	it('should open the returned url if the document can be opened', async () => {
		const fileOpenUrl = faker.internet.url();
		server.use(
			http.get<Record<string, string>, never, OpenWithDocsResponse>(
				`${DOCS_ENDPOINT}${OPEN_FILE_PATH}/:id`,
				() => HttpResponse.json({ fileOpenUrl })
			)
		);

		const spyWindowOpen = jest.spyOn(window, 'open').mockImplementation();
		const { result } = setupHook(() => useOpenWithDocs());
		await result.current('id');
		expect(spyWindowOpen).toHaveBeenCalledWith(fileOpenUrl, fileOpenUrl);
	});

	it('should show specific snackbar if document cannot be opened due to its size', async () => {
		server.use(
			http.get<Record<string, string>, never, OpenWithDocsResponse>(
				`${DOCS_ENDPOINT}${OPEN_FILE_PATH}/:id`,
				() => HttpResponse.json(null, { status: HTTP_STATUS_CODE.docsFileSizeExceeded })
			)
		);

		const spyWindowOpen = jest.spyOn(window, 'open').mockImplementation();
		const { result } = setupHook(() => useOpenWithDocs());

		await act(async () => {
			await result.current('id');
		});

		expect(spyWindowOpen).not.toHaveBeenCalled();
		const label = (
			<>
				<Text color="gray6" size="medium" overflow={'break-word'}>
					{'The item exceeds the size limit allowed and cannot be opened.'}
				</Text>
				<Text color="gray6" size="medium" overflow={'break-word'}>
					{'To view the item, please download it on your device'}
				</Text>
			</>
		);
		expect(mockCreateSnackbar).toHaveBeenCalledWith(
			expect.objectContaining<CreateSnackbarFnArgs>({
				label,
				actionLabel: 'Ok',
				disableAutoHide: true,
				severity: 'warning'
			})
		);
	});

	it('should show generic error snackbar if status code is unhandled', async () => {
		server.use(
			http.get<Record<string, string>, never, OpenWithDocsResponse>(
				`${DOCS_ENDPOINT}${OPEN_FILE_PATH}/:id`,
				() => HttpResponse.json(null, { status: 500 })
			)
		);

		const spyWindowOpen = jest.spyOn(window, 'open').mockImplementation();
		const { result } = setupHook(() => useOpenWithDocs());

		await act(async () => {
			await result.current('id');
		});

		expect(spyWindowOpen).not.toHaveBeenCalled();
		const label = 'Something went wrong';
		expect(mockCreateSnackbar).toHaveBeenCalledWith(
			expect.objectContaining<CreateSnackbarFnArgs>({ label })
		);
	});

	it('should show generic error snackbar if there is a network error', async () => {
		server.use(http.get(`${DOCS_ENDPOINT}${OPEN_FILE_PATH}/:id`, () => HttpResponse.error()));

		const spyWindowOpen = jest.spyOn(window, 'open').mockImplementation();
		const { result } = setupHook(() => useOpenWithDocs());

		await act(async () => {
			await result.current('id');
		});

		expect(spyWindowOpen).not.toHaveBeenCalled();
		const label = 'Something went wrong';
		expect(mockCreateSnackbar).toHaveBeenCalledWith(
			expect.objectContaining<CreateSnackbarFnArgs>({ label })
		);
	});
});
