/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { graphql, http, HttpResponse } from 'msw';

import { getFilesApiVersion } from './filesApiVersion';
import { mockGetConfigs, mockGetNode, mockGetVersions } from './resolverMocks';
import { downloadMultipleNodes, downloadNode, uploadToTargetModule } from './utils';
import server from '../../mocks/server';
import { isCarbonioCEVar } from '../apollo/isCarbonioCEVar';
import {
	DOWNLOAD_MULTIPLE_PATH,
	DOWNLOAD_PATH,
	DOWNLOAD_PATH_CHECK,
	FILES_API_VERSION,
	FILES_API_VERSION_HEADER,
	REST_ENDPOINT,
	UPLOAD_PATH,
	UPLOAD_TO_PATH,
	UPLOAD_VERSION_PATH
} from '../constants';
import { populateFile, populateLocalRoot } from '../mocks/mockUtils';
import { createUploadDataTransfer, screen, setup, uploadWithDnD } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { GetConfigsDocument } from '../types/graphql/types';
import UploadVersionButton from '../views/components/versioning/UploadVersionButton';
import UploadView from '../views/UploadView';

describe('Files API version', () => {
	const shipped = { ...FILES_API_VERSION };

	beforeEach(() => {
		Object.assign(FILES_API_VERSION, { ce: '3.0.14', advanced: '4.0.14' });
	});

	afterEach(() => {
		Object.assign(FILES_API_VERSION, shipped);
	});

	describe('per edition', () => {
		it('is the CE version while the edition is not known yet', () => {
			isCarbonioCEVar(undefined);
			expect(getFilesApiVersion()).toBe('3.0.14');
		});

		it('is the CE version on Carbonio CE', () => {
			isCarbonioCEVar(true);
			expect(getFilesApiVersion()).toBe('3.0.14');
		});

		it('is the Advanced version on Carbonio Advanced', () => {
			isCarbonioCEVar(false);
			expect(getFilesApiVersion()).toBe('4.0.14');
		});
	});

	describe('on the wire', () => {
		it('is sent on every GraphQL operation', async () => {
			isCarbonioCEVar(false);
			const sent = vi.fn();
			server.use(
				graphql.query(GetConfigsDocument, ({ request }) => {
					sent(request.headers.get(FILES_API_VERSION_HEADER));
					return HttpResponse.json({ data: { getConfigs: [] } });
				})
			);
			await global.apolloClient.query({ query: GetConfigsDocument, fetchPolicy: 'network-only' });
			expect(sent).toHaveBeenCalledWith('4.0.14');
		});

		it('is sent on an upload', async () => {
			const localRoot = populateLocalRoot();
			const node = populateFile();
			node.parent = localRoot;
			const sent = vi.fn();
			server.use(
				http.post(`${REST_ENDPOINT}${UPLOAD_PATH}`, ({ request }) => {
					sent(request.headers.get(FILES_API_VERSION_HEADER));
					return HttpResponse.json({ nodeId: node.id });
				})
			);
			setup(<UploadView />);
			const dropzone = await screen.findByText(/nothing here/i);
			await uploadWithDnD(dropzone, createUploadDataTransfer([node]));
			await vi.waitFor(() => expect(sent).toHaveBeenCalledWith('3.0.14'));
		});

		it('is sent on the upload of a version', async () => {
			const localRoot = populateLocalRoot();
			const fileVersion = populateFile();
			fileVersion.parent = localRoot;
			fileVersion.permissions.can_write_file = true;
			const sent = vi.fn();
			server.use(
				http.post(`${REST_ENDPOINT}${UPLOAD_VERSION_PATH}`, ({ request }) => {
					sent(request.headers.get(FILES_API_VERSION_HEADER));
					return HttpResponse.json({ nodeId: fileVersion.id, version: 2 });
				})
			);
			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [localRoot] }),
					getConfigs: mockGetConfigs(),
					getVersions: mockGetVersions([fileVersion])
				}
			} satisfies Partial<Resolvers>;
			const { user } = setup(
				<>
					<UploadVersionButton node={fileVersion} disabled={false} />
					<UploadView />
				</>,
				{ mocks }
			);
			await user.click(await screen.findByRole('button', { name: /upload version/i }));
			const file = new File(['(⌐□_□)'], fileVersion.name, { type: fileVersion.mime_type });
			await user.upload(await screen.findByAltText(/Hidden file input/i), file);
			await vi.waitFor(() => expect(sent).toHaveBeenCalledWith('3.0.14'));
		});

		it('is sent on an upload to another module', async () => {
			const sent = vi.fn();
			server.use(
				http.post(`${REST_ENDPOINT}${UPLOAD_TO_PATH}`, ({ request }) => {
					sent(request.headers.get(FILES_API_VERSION_HEADER));
					return HttpResponse.json({ attachmentId: 'attachment' });
				})
			);
			await uploadToTargetModule({ nodeId: 'node', targetModule: 'MAILS' });
			expect(sent).toHaveBeenCalledWith('3.0.14');
		});

		it('is sent on the check of a download', async () => {
			const sent = vi.fn();
			server.use(
				http.get(`${REST_ENDPOINT}${DOWNLOAD_PATH}/:id${DOWNLOAD_PATH_CHECK}`, ({ request }) => {
					sent(request.headers.get(FILES_API_VERSION_HEADER));
					return HttpResponse.json(null, { status: 404 });
				})
			);
			await downloadNode('node');
			expect(sent).toHaveBeenCalledWith('3.0.14');
		});

		it('is sent on the check of a multiple download', async () => {
			const sent = vi.fn();
			server.use(
				http.post(
					`${REST_ENDPOINT}${DOWNLOAD_MULTIPLE_PATH}${DOWNLOAD_PATH_CHECK}`,
					({ request }) => {
						sent(request.headers.get(FILES_API_VERSION_HEADER));
						return HttpResponse.json(null, { status: 404 });
					}
				)
			);
			await downloadMultipleNodes(['node']);
			expect(sent).toHaveBeenCalledWith('3.0.14');
		});
	});
});
