/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/react';
import { CreateSnackbarFn, CreateSnackbarFnArgs } from '@zextras/carbonio-design-system';
import * as shell from '@zextras/carbonio-shell-ui';
import { http, HttpResponse } from 'msw';
import { MockedFunction } from 'vitest';

import { useSendViaMail } from './useSendViaMail';
import {
	HTTP_STATUS_CODE,
	REST_ENDPOINT,
	UPLOAD_TO_PATH
} from '../carbonio-files-ui-common/constants';
import { populateFile } from '../carbonio-files-ui-common/mocks/mockUtils';
import { setupHook } from '../carbonio-files-ui-common/tests/utils';
import server from '../mocks/server';

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

describe('useSendViaMail hook', () => {
	it('should open the mail composer with the attachment if the upload succeeds', async () => {
		const attachmentId = faker.string.uuid();
		server.use(
			http.post(`${REST_ENDPOINT}${UPLOAD_TO_PATH}`, () => HttpResponse.json({ attachmentId }))
		);
		const integratedFunction = vi.fn();
		vi.spyOn(shell, 'getIntegratedFunction').mockReturnValue([integratedFunction, true]);
		const node = populateFile();

		const { result } = setupHook(() => useSendViaMail());
		result.current.sendViaMail(node);

		await waitFor(() => expect(integratedFunction).toHaveBeenCalled());
		expect(integratedFunction).toHaveBeenCalledWith({
			attachments: [
				{
					aid: attachmentId,
					filename: node.name,
					size: node.size,
					isInline: false,
					contentType: node.mime_type
				}
			]
		});
		expect(mockCreateSnackbar).not.toHaveBeenCalled();
	});

	it('should show a specific snackbar if the file exceeds the size limit allowed', async () => {
		server.use(
			http.post(`${REST_ENDPOINT}${UPLOAD_TO_PATH}`, () =>
				HttpResponse.json(null, { status: HTTP_STATUS_CODE.fileSizeExceeded })
			)
		);
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const integratedFunction = vi.fn();
		vi.spyOn(shell, 'getIntegratedFunction').mockReturnValue([integratedFunction, true]);
		const node = populateFile();

		const { result } = setupHook(() => useSendViaMail());
		result.current.sendViaMail(node);

		await waitFor(() => expect(mockCreateSnackbar).toHaveBeenCalled());
		expect(mockCreateSnackbar).toHaveBeenCalledWith(
			expect.objectContaining<CreateSnackbarFnArgs>({
				label:
					'This file is too large to attach. Open a new e-mail and use Add from Files to share it as a Smart Link instead.',
				actionLabel: 'Ok',
				disableAutoHide: true,
				severity: 'warning'
			})
		);
		expect(integratedFunction).not.toHaveBeenCalled();
	});

	it('should show the generic error snackbar if the status code is not the size limit one', async () => {
		server.use(
			http.post(`${REST_ENDPOINT}${UPLOAD_TO_PATH}`, () =>
				HttpResponse.json(null, { status: HTTP_STATUS_CODE.internalServerError })
			)
		);
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const integratedFunction = vi.fn();
		vi.spyOn(shell, 'getIntegratedFunction').mockReturnValue([integratedFunction, true]);
		const node = populateFile();

		const { result } = setupHook(() => useSendViaMail());
		result.current.sendViaMail(node);

		await waitFor(() => expect(mockCreateSnackbar).toHaveBeenCalled());
		expect(mockCreateSnackbar).toHaveBeenCalledWith(
			expect.objectContaining<CreateSnackbarFnArgs>({
				label: 'Something went wrong',
				hideButton: true,
				severity: 'warning'
			})
		);
		expect(integratedFunction).not.toHaveBeenCalled();
	});
});
