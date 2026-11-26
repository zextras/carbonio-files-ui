/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { graphql, http, HttpResponse } from 'msw';

import { FilesApiServerVersions, getFilesApi, negotiateVersion } from './filesApiVersion';
import { mockGetConfigs, mockGetNode, mockGetVersions } from './resolverMocks';
import { downloadMultipleNodes, downloadNode, uploadToTargetModule } from './utils';
import server from '../../mocks/server';
import { isCarbonioCEVar } from '../apollo/isCarbonioCEVar';
import {
	DOWNLOAD_MULTIPLE_PATH,
	DOWNLOAD_PATH,
	DOWNLOAD_PATH_CHECK,
	FILES_API_VERSION_HEADER,
	FILES_API_VERSIONS_PATH,
	REST_ENDPOINT,
	UPLOAD_PATH,
	UPLOAD_TO_PATH,
	UPLOAD_VERSION_PATH
} from '../constants';
import { ICON_REGEXP } from '../constants/test';
import { versionsResponse } from '../mocks/handleVersionsRequest';
import { populateFile, populateLocalRoot } from '../mocks/mockUtils';
import { createUploadDataTransfer, screen, setup, uploadWithDnD } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { GetConfigsDocument } from '../types/graphql/types';
import UploadVersionButton from '../views/components/versioning/UploadVersionButton';
import UploadView from '../views/UploadView';

const SNAPSHOT = '3.0.15-187.abc1234-SNAPSHOT';

function serverAt(versions: FilesApiServerVersions): ReturnType<typeof vi.fn> {
	const discovered = vi.fn();
	server.use(
		http.get(`${REST_ENDPOINT}${FILES_API_VERSIONS_PATH}`, () => {
			discovered();
			return HttpResponse.json(versionsResponse(versions));
		})
	);
	return discovered;
}

describe('Files API version', () => {
	describe('negotiation', () => {
		it('is the newest version of the server for a client that follows current', () => {
			expect(
				negotiateVersion(
					{ oldest: '3.0.14', newest: 'current' },
					{ current: SNAPSHOT, oldestSupported: '3.0.14' }
				)
			).toBe(SNAPSHOT);
		});

		it('is the newest version of the client on a newer server', () => {
			expect(
				negotiateVersion(
					{ oldest: '3.0.14', newest: '3.0.14' },
					{ current: '4.0.0', oldestSupported: '3.0.14' }
				)
			).toBe('3.0.14');
		});

		it('is the newest version of the server on an older server', () => {
			expect(
				negotiateVersion(
					{ oldest: '3.0.14', newest: '4.0.0' },
					{ current: '3.1.0', oldestSupported: '3.0.14' }
				)
			).toBe('3.1.0');
		});

		it('is none when the client is older than every version the server supports', () => {
			expect(
				negotiateVersion(
					{ oldest: '3.0.14', newest: '3.0.14' },
					{ current: '4.0.0', oldestSupported: '3.1.0' }
				)
			).toBeUndefined();
		});

		it('is none when the server is older than every version the client supports', () => {
			expect(
				negotiateVersion(
					{ oldest: '3.1.0', newest: 'current' },
					{ current: '3.0.14', oldestSupported: '3.0.14' }
				)
			).toBeUndefined();
		});
	});

	describe('discovery', () => {
		it('follows the edition the server declares', async () => {
			isCarbonioCEVar(true);
			serverAt({ edition: 'advanced', current: '4.0.14', oldestSupported: '4.0.14' });
			await expect(getFilesApi()).resolves.toEqual({ edition: 'advanced', version: '4.0.14' });
		});

		it('takes the shell edition and the oldest version of the client on a server without versions', async () => {
			isCarbonioCEVar(false);
			server.use(
				http.get(`${REST_ENDPOINT}${FILES_API_VERSIONS_PATH}`, () =>
					HttpResponse.json(null, { status: 404 })
				)
			);
			await expect(getFilesApi()).resolves.toEqual({ edition: 'advanced', version: '4.0.14' });
		});

		it('asks the server once', async () => {
			const discovered = serverAt({ edition: 'ce', current: SNAPSHOT, oldestSupported: '3.0.14' });
			await getFilesApi();
			await getFilesApi();
			expect(discovered).toHaveBeenCalledTimes(1);
		});
	});

	describe('on the wire', () => {
		beforeEach(() => {
			serverAt({ edition: 'ce', current: SNAPSHOT, oldestSupported: '3.0.14' });
		});

		it('is sent on every GraphQL operation', async () => {
			const sent = vi.fn();
			server.use(
				graphql.query(GetConfigsDocument, ({ request }) => {
					sent(request.headers.get(FILES_API_VERSION_HEADER));
					return HttpResponse.json({ data: { getConfigs: [] } });
				})
			);
			await global.apolloClient.query({ query: GetConfigsDocument, fetchPolicy: 'network-only' });
			expect(sent).toHaveBeenCalledWith(SNAPSHOT);
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
			await vi.waitFor(() => expect(sent).toHaveBeenCalledWith(SNAPSHOT));
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
			await vi.waitFor(() => expect(sent).toHaveBeenCalledWith(SNAPSHOT));
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
			expect(sent).toHaveBeenCalledWith(SNAPSHOT);
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
			expect(sent).toHaveBeenCalledWith(SNAPSHOT);
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
			expect(sent).toHaveBeenCalledWith(SNAPSHOT);
		});
	});

	describe('without a version in common', () => {
		beforeEach(() => {
			serverAt({ edition: 'ce', current: '3.0.13', oldestSupported: '3.0.13' });
		});

		it('does not send GraphQL operations', async () => {
			const sent = vi.fn();
			server.use(
				graphql.query(GetConfigsDocument, () => {
					sent();
					return HttpResponse.json({ data: { getConfigs: [] } });
				})
			);
			await expect(
				global.apolloClient.query({ query: GetConfigsDocument, fetchPolicy: 'network-only' })
			).rejects.toThrow('No Files API version in common with the server');
			expect(sent).not.toHaveBeenCalled();
		});

		it('fails an upload without sending it', async () => {
			const localRoot = populateLocalRoot();
			const node = populateFile();
			node.parent = localRoot;
			const sent = vi.fn();
			server.use(
				http.post(`${REST_ENDPOINT}${UPLOAD_PATH}`, () => {
					sent();
					return HttpResponse.json({ nodeId: node.id });
				})
			);
			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [localRoot] }),
					getConfigs: mockGetConfigs()
				}
			} satisfies Partial<Resolvers>;
			setup(<UploadView />, { mocks });
			const dropzone = await screen.findByText(/nothing here/i);
			await uploadWithDnD(dropzone, createUploadDataTransfer([node]));
			expect(await screen.findByTestId(ICON_REGEXP.uploadFailed)).toBeVisible();
			expect(sent).not.toHaveBeenCalled();
		});
	});
});
