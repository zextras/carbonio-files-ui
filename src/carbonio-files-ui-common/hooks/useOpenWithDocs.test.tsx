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
import { MockedFunction } from 'vitest';

import { OpenWithDocsResponse, useOpenWithDocs } from './useOpenWithDocs';
import server from '../../mocks/server';
import { DOCS_ENDPOINT, HTTP_STATUS_CODE, OPEN_FILE_PATH } from '../constants';
import { setupHook } from '../tests/utils';

let mockCreateSnackbar: MockedFunction<CreateSnackbarFn>;

vi.mock('@zextras/carbonio-design-system', async () => {
	const actual = await vi.importActual('@zextras/carbonio-design-system');
	return {
		...actual,
		useSnackbar: (): CreateSnackbarFn => mockCreateSnackbar
	};
});

beforeEach(() => {
	mockCreateSnackbar = vi.fn();
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

		const spyWindowOpen = vi.spyOn(window, 'open').mockImplementation(vi.fn());
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

		const spyWindowOpen = vi.spyOn(window, 'open').mockImplementation(vi.fn());
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

		const spyWindowOpen = vi.spyOn(window, 'open').mockImplementation(vi.fn());
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

		const spyWindowOpen = vi.spyOn(window, 'open').mockImplementation(vi.fn());
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

	it('should include the correct offset_from_utc query parameter in the request', async () => {
		const offsetFromUtcToVerify = -new Date().getTimezoneOffset();
		let offsetFromUtc: string | null = null;
		const fileOpenUrl = faker.internet.url();
		server.use(
			http.get<Record<string, string>, never, OpenWithDocsResponse>(
				`${DOCS_ENDPOINT}${OPEN_FILE_PATH}/:id`,
				(req) => {
					const url = new URL(req.request.url);
					offsetFromUtc = url.searchParams.get('offset_from_utc');
					return HttpResponse.json({ fileOpenUrl });
				}
			)
		);
		const spyWindowOpen = vi.spyOn(window, 'open').mockImplementation(vi.fn());
		const { result } = setupHook(() => useOpenWithDocs());
		await result.current('id');
		expect(offsetFromUtc).toBe(offsetFromUtcToVerify.toString());
		expect(spyWindowOpen).toHaveBeenCalledWith(fileOpenUrl, fileOpenUrl);
	});

	it('should include the version query parameter in the request if provided', async () => {
		const fileOpenUrl = faker.internet.url();
		let versionParam: string | null = null;
		const version = 1;
		server.use(
			http.get<Record<string, string>, never, OpenWithDocsResponse>(
				`${DOCS_ENDPOINT}${OPEN_FILE_PATH}/:id`,
				(req) => {
					const url = new URL(req.request.url);
					versionParam = url.searchParams.get('version');
					return HttpResponse.json({ fileOpenUrl });
				}
			)
		);
		const spyWindowOpen = vi.spyOn(window, 'open').mockImplementation(vi.fn());
		const { result } = setupHook(() => useOpenWithDocs());
		await result.current('id', version);
		expect(versionParam).toBe(version.toString());
		expect(spyWindowOpen).toHaveBeenCalledWith(fileOpenUrl, fileOpenUrl);
	});
});
