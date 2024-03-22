/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { rest } from 'msw';

import UploadView from './UploadView';
import server from '../../mocks/server';
import { REST_ENDPOINT, UPLOAD_PATH, UPLOAD_STATUS_CODE } from '../constants';
import { populateFile, populateLocalRoot } from '../mocks/mockUtils';
import { createUploadDataTransfer, screen, setup, uploadWithDnD } from '../utils/testUtils';

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions');

describe('Upload view quota', () => {
	it('should render the banner if there is a failed item for over quota', async () => {
		const localRoot = populateLocalRoot();
		const node = populateFile();
		node.parent = localRoot;
		const dataTransferObj = createUploadDataTransfer([node]);
		server.use(
			rest.post(`${REST_ENDPOINT}${UPLOAD_PATH}`, (req, res, ctx) =>
				res(ctx.status(UPLOAD_STATUS_CODE.overQuota))
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
});
