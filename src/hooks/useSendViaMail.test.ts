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

const FILE_SIZE_EXCEEDED_LABEL =
	'This file is too large to attach. Open a new e-mail and use Add from Files to share it as a Smart Link instead.';

function mockMaxMessageSize(maxMessageSize: number): void {
	vi.spyOn(shell, 'useUserSettings').mockReturnValue({
		attrs: { zimbraMtaMaxMessageSize: `${maxMessageSize}` },
		prefs: {},
		props: []
	});
}

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
				label: FILE_SIZE_EXCEEDED_LABEL,
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

	describe('max message size check', () => {
		it('should show the file size exceeded snackbar without requesting the upload if the attachment does not fit the max message size', async () => {
			const uploadTo = vi.fn(() => HttpResponse.json({ attachmentId: faker.string.uuid() }));
			server.use(http.post(`${REST_ENDPOINT}${UPLOAD_TO_PATH}`, uploadTo));
			mockMaxMessageSize(1000);
			const integratedFunction = vi.fn();
			vi.spyOn(shell, 'getIntegratedFunction').mockReturnValue([integratedFunction, true]);
			const node = populateFile();
			node.size = 1000;

			const { result } = setupHook(() => useSendViaMail());
			result.current.sendViaMail(node);

			await waitFor(() => expect(mockCreateSnackbar).toHaveBeenCalled());
			expect(mockCreateSnackbar).toHaveBeenCalledWith(
				expect.objectContaining<CreateSnackbarFnArgs>({
					label: FILE_SIZE_EXCEEDED_LABEL,
					actionLabel: 'Ok',
					disableAutoHide: true,
					severity: 'warning'
				})
			);
			expect(uploadTo).not.toHaveBeenCalled();
			expect(integratedFunction).not.toHaveBeenCalled();
		});

		it('should apply the base64 conversion rate to the size of the file', async () => {
			const uploadTo = vi.fn(() => HttpResponse.json({ attachmentId: faker.string.uuid() }));
			server.use(http.post(`${REST_ENDPOINT}${UPLOAD_TO_PATH}`, uploadTo));
			// the file fits the limit by its own size, but not once encoded as a base64 attachment
			mockMaxMessageSize(1200);
			const integratedFunction = vi.fn();
			vi.spyOn(shell, 'getIntegratedFunction').mockReturnValue([integratedFunction, true]);
			const node = populateFile();
			node.size = 1000;

			const { result } = setupHook(() => useSendViaMail());
			result.current.sendViaMail(node);

			await waitFor(() => expect(mockCreateSnackbar).toHaveBeenCalled());
			expect(mockCreateSnackbar).toHaveBeenCalledWith(
				expect.objectContaining<CreateSnackbarFnArgs>({ label: FILE_SIZE_EXCEEDED_LABEL })
			);
			expect(uploadTo).not.toHaveBeenCalled();
		});

		it('should request the upload if the attachment fits the max message size', async () => {
			const attachmentId = faker.string.uuid();
			server.use(
				http.post(`${REST_ENDPOINT}${UPLOAD_TO_PATH}`, () => HttpResponse.json({ attachmentId }))
			);
			mockMaxMessageSize(2000);
			const integratedFunction = vi.fn();
			vi.spyOn(shell, 'getIntegratedFunction').mockReturnValue([integratedFunction, true]);
			const node = populateFile();
			node.size = 1000;

			const { result } = setupHook(() => useSendViaMail());
			result.current.sendViaMail(node);

			await waitFor(() => expect(integratedFunction).toHaveBeenCalled());
			expect(integratedFunction).toHaveBeenCalledWith(
				expect.objectContaining({ attachments: [expect.objectContaining({ aid: attachmentId })] })
			);
			expect(mockCreateSnackbar).not.toHaveBeenCalled();
		});

		it('should request the upload if the account has no max message size configured', async () => {
			const attachmentId = faker.string.uuid();
			server.use(
				http.post(`${REST_ENDPOINT}${UPLOAD_TO_PATH}`, () => HttpResponse.json({ attachmentId }))
			);
			const integratedFunction = vi.fn();
			vi.spyOn(shell, 'getIntegratedFunction').mockReturnValue([integratedFunction, true]);
			const node = populateFile();
			node.size = faker.number.int({ min: 1000000 });

			const { result } = setupHook(() => useSendViaMail());
			result.current.sendViaMail(node);

			await waitFor(() => expect(integratedFunction).toHaveBeenCalled());
			expect(mockCreateSnackbar).not.toHaveBeenCalled();
		});
	});
});
