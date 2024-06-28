/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { http, HttpResponse } from 'msw';

import UploadVersionButton from './components/versioning/UploadVersionButton';
import UploadView from './UploadView';
import server from '../../mocks/server';
import { REST_ENDPOINT, UPLOAD_PATH, UPLOAD_STATUS_CODE, UPLOAD_VERSION_PATH } from '../constants';
import { ICON_REGEXP } from '../constants/test';
import {
	UploadRequestBody,
	UploadVersionRequestParams,
	UploadVersionResponse
} from '../mocks/handleUploadVersionRequest';
import { populateFile, populateLocalRoot } from '../mocks/mockUtils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { mockGetConfigs, mockGetNode, mockGetVersions } from '../utils/resolverMocks';
import { createUploadDataTransfer, screen, setup, uploadWithDnD } from '../utils/testUtils';

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions');

describe('Upload view quota', () => {
	it('should render the banner if there is a failed item for over quota', async () => {
		const localRoot = populateLocalRoot();
		const node = populateFile();
		node.parent = localRoot;
		const dataTransferObj = createUploadDataTransfer([node]);
		server.use(
			http.post(`${REST_ENDPOINT}${UPLOAD_PATH}`, () =>
				HttpResponse.json(null, { status: UPLOAD_STATUS_CODE.overQuota })
			)
		);
		setup(<UploadView />);
		const dropzone = await screen.findByText(/nothing here/i);
		await uploadWithDnD(dropzone, dataTransferObj);
		expect(await screen.findByText(/Quota exceeded/i)).toBeVisible();
		expect(
			screen.getByText(
				'The uploading of some items failed because you have reached your storage limit. Delete some items to free up storage space and try again.'
			)
		).toBeVisible();
	});

	it('should not show the banner if the item failed for over quota fails again after retry for a different reason', async () => {
		const localRoot = populateLocalRoot();
		const node = populateFile();
		node.parent = localRoot;
		const dataTransferObj = createUploadDataTransfer([node]);

		server.use(
			http.post(
				`${REST_ENDPOINT}${UPLOAD_PATH}`,
				() => HttpResponse.json(null, { status: UPLOAD_STATUS_CODE.overQuota }),
				{ once: true }
			),
			http.post(
				`${REST_ENDPOINT}${UPLOAD_PATH}`,
				() => HttpResponse.json(null, { status: UPLOAD_STATUS_CODE.internalServerError }),
				{ once: true }
			)
		);
		const { user } = setup(<UploadView />);
		const dropzone = await screen.findByText(/nothing here/i);
		await uploadWithDnD(dropzone, dataTransferObj);
		expect(await screen.findByText(/Quota exceeded/i)).toBeVisible();
		await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.retryUpload }));
		await screen.findByTestId(ICON_REGEXP.uploadFailed);
		expect(screen.queryByText(/quota exceeded/i)).not.toBeInTheDocument();
	});

	it('should render the banner if the upload version fails for over quota', async () => {
		const localRoot = populateLocalRoot();
		const fileVersion = populateFile();
		fileVersion.parent = localRoot;
		fileVersion.permissions.can_write_file = true;

		const mocks = {
			Query: {
				getNode: mockGetNode({ getBaseNode: [localRoot] }),
				getConfigs: mockGetConfigs(),
				getVersions: mockGetVersions([fileVersion])
			}
		} satisfies Partial<Resolvers>;

		server.use(
			http.post<UploadVersionRequestParams, UploadRequestBody, UploadVersionResponse>(
				`${REST_ENDPOINT}${UPLOAD_VERSION_PATH}`,
				() => HttpResponse.json(null, { status: UPLOAD_STATUS_CODE.overQuota })
			)
		);

		const { user } = setup(
			<>
				<UploadVersionButton node={fileVersion} disabled={false} />
				<UploadView />
			</>,
			{ mocks }
		);
		const uploadButton = await screen.findByRole('button', { name: /upload version/i });
		await user.click(uploadButton);
		const file = new File(['(⌐□_□)'], fileVersion.name, { type: fileVersion.mime_type });
		const input = await screen.findByAltText(/Hidden file input/i);
		await user.upload(input, file);
		expect(await screen.findByText(/Quota exceeded/i)).toBeVisible();
		expect(
			screen.getByText(
				'The uploading of some items failed because you have reached your storage limit. Delete some items to free up storage space and try again.'
			)
		).toBeVisible();
	});
});
