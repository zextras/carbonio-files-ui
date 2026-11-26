/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { graphql, http, HttpResponse } from 'msw';

import {
	compareVersions,
	FilesApiServerVersions,
	getFilesApi,
	negotiateVersion
} from './filesApiVersion';
import { mockGetConfigs, mockGetNode, mockGetVersions } from './resolverMocks';
import { downloadMultipleNodes, downloadNode, uploadToTargetModule } from './utils';
import server from '../../mocks/server';
import { isCarbonioCEVar } from '../apollo/isCarbonioCEVar';
import {
	DOWNLOAD_MULTIPLE_PATH,
	DOWNLOAD_PATH,
	DOWNLOAD_PATH_CHECK,
	FILES_API_VERSION_HEADER,
	ERROR_CODE,
	FILES_API_VERSIONS_PATH,
	HTTP_STATUS_CODE,
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
const NEGOTIATED = '3.0.14';

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

const versionRejection = (): Response =>
	new Response(
		JSON.stringify({
			code: ERROR_CODE.unsupportedApiVersion,
			message: 'unsupported',
			received: '3.0.14',
			oldestSupported: '3.0.15',
			current: '3.0.15'
		}),
		{
			status: HTTP_STATUS_CODE.unprocessableEntity,
			headers: { 'Content-Type': 'application/json' }
		}
	);

function versionsSequence(sequence: FilesApiServerVersions[]): ReturnType<typeof vi.fn> {
	const discovered = vi.fn();
	server.use(
		http.get(`${REST_ENDPOINT}${FILES_API_VERSIONS_PATH}`, () => {
			const versions = sequence[Math.min(discovered.mock.calls.length, sequence.length - 1)];
			discovered();
			return HttpResponse.json(versionsResponse(versions));
		})
	);
	return discovered;
}

describe('Files API version', () => {
	describe('ordering', () => {
		it('puts current above every version', () => {
			expect(compareVersions('current', '9.9.9')).toBeGreaterThan(0);
			expect(compareVersions('3.0.14-SNAPSHOT', 'current')).toBeLessThan(0);
		});

		it('compares X.Y.Z numerically', () => {
			expect(compareVersions('3.0.9', '3.0.14')).toBeLessThan(0);
			expect(compareVersions('3.1.0', '3.0.14-SNAPSHOT')).toBeGreaterThan(0);
		});

		it('puts a local snapshot above its release', () => {
			expect(compareVersions('3.0.14-SNAPSHOT', '3.0.14')).toBeGreaterThan(0);
		});

		it('puts a CI snapshot above its X.Y.Z', () => {
			expect(compareVersions(SNAPSHOT, '3.0.15')).toBeGreaterThan(0);
			expect(compareVersions(SNAPSHOT, '3.0.14')).toBeGreaterThan(0);
		});

		it('puts a snapshot above a release candidate of the same X.Y.Z', () => {
			expect(compareVersions('3.0.14-SNAPSHOT', '3.0.14-rc.1')).toBeGreaterThan(0);
		});

		it('puts a release candidate below its release', () => {
			expect(compareVersions('3.0.14-rc.1', '3.0.14')).toBeLessThan(0);
		});

		it('orders CI snapshots by commit count', () => {
			expect(
				compareVersions('3.0.15-187.abc1234-SNAPSHOT', '3.0.15-190.def5678-SNAPSHOT')
			).toBeLessThan(0);
			expect(
				compareVersions('3.0.15-1000.abc1234-SNAPSHOT', '3.0.15-190.def5678-SNAPSHOT')
			).toBeGreaterThan(0);
		});
	});

	describe('negotiation', () => {
		it('finds a version with a local snapshot server', () => {
			expect(
				negotiateVersion(
					{ oldest: '3.0.14', newest: 'current' },
					{ current: '3.0.14-SNAPSHOT', oldestSupported: '3.0.14' }
				)
			).toBe('3.0.14-SNAPSHOT');
		});

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
			expect(sent).toHaveBeenCalledWith(NEGOTIATED);
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
			await vi.waitFor(() => expect(sent).toHaveBeenCalledWith(NEGOTIATED));
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
			await vi.waitFor(() => expect(sent).toHaveBeenCalledWith(NEGOTIATED));
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
			expect(sent).toHaveBeenCalledWith(NEGOTIATED);
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
			expect(sent).toHaveBeenCalledWith(NEGOTIATED);
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
			expect(sent).toHaveBeenCalledWith(NEGOTIATED);
		});
	});

	describe('after a rejected version', () => {
		const older: FilesApiServerVersions = {
			edition: 'ce',
			current: '3.0.14',
			oldestSupported: '3.0.14'
		};
		const newer: FilesApiServerVersions = {
			edition: 'ce',
			current: '3.0.15',
			oldestSupported: '3.0.14'
		};

		it('retries a GraphQL operation once with the rediscovered version', async () => {
			const discovered = versionsSequence([older, newer]);
			const sent = vi.fn();
			server.use(
				graphql.query(GetConfigsDocument, ({ request }) => {
					const version = request.headers.get(FILES_API_VERSION_HEADER);
					sent(version);
					return sent.mock.calls.length > 1
						? HttpResponse.json({ data: { getConfigs: [] } })
						: versionRejection();
				})
			);
			await global.apolloClient.query({ query: GetConfigsDocument, fetchPolicy: 'network-only' });
			expect(sent.mock.calls).toEqual([['3.0.14'], ['3.0.14']]);
			expect(discovered).toHaveBeenCalledTimes(2);
		});

		it('does not retry a GraphQL operation after a second consecutive rejection', async () => {
			versionsSequence([older, newer]);
			const sent = vi.fn();
			server.use(
				graphql.query(GetConfigsDocument, () => {
					sent();
					return versionRejection();
				})
			);
			await expect(
				global.apolloClient.query({ query: GetConfigsDocument, fetchPolicy: 'network-only' })
			).rejects.toThrow();
			expect(sent).toHaveBeenCalledTimes(2);
		});

		it('does not retry a GraphQL 422 without the version rejection code', async () => {
			const discovered = versionsSequence([older]);
			const sent = vi.fn();
			server.use(
				graphql.query(GetConfigsDocument, () => {
					sent();
					return new Response(JSON.stringify({ code: 'OVER_QUOTA_REACHED' }), {
						status: HTTP_STATUS_CODE.unprocessableEntity,
						headers: { 'Content-Type': 'application/json' }
					});
				})
			);
			await expect(
				global.apolloClient.query({ query: GetConfigsDocument, fetchPolicy: 'network-only' })
			).rejects.toThrow();
			expect(sent).toHaveBeenCalledTimes(1);
			expect(discovered).toHaveBeenCalledTimes(1);
		});

		it('retries the check of a download once with the rediscovered version', async () => {
			const discovered = versionsSequence([older, newer]);
			const sent = vi.fn();
			server.use(
				http.get(`${REST_ENDPOINT}${DOWNLOAD_PATH}/:id${DOWNLOAD_PATH_CHECK}`, ({ request }) => {
					const version = request.headers.get(FILES_API_VERSION_HEADER);
					sent(version);
					return sent.mock.calls.length > 1
						? HttpResponse.json(null, { status: 404 })
						: versionRejection();
				})
			);
			const response = await downloadNode('node');
			expect(sent.mock.calls).toEqual([['3.0.14'], ['3.0.14']]);
			expect(discovered).toHaveBeenCalledTimes(2);
			expect(response.status).toBe(404);
		});

		it('retries the check of a download only once', async () => {
			versionsSequence([older, newer]);
			const sent = vi.fn();
			server.use(
				http.get(`${REST_ENDPOINT}${DOWNLOAD_PATH}/:id${DOWNLOAD_PATH_CHECK}`, () => {
					sent();
					return versionRejection();
				})
			);
			const response = await downloadNode('node');
			expect(sent).toHaveBeenCalledTimes(2);
			expect(response.status).toBe(HTTP_STATUS_CODE.unprocessableEntity);
		});

		it('marks an upload as failed without over quota and negotiates again on the next call', async () => {
			const discovered = versionsSequence([older, newer]);
			const localRoot = populateLocalRoot();
			const node = populateFile();
			node.parent = localRoot;
			const sent = vi.fn();
			server.use(
				http.post(`${REST_ENDPOINT}${UPLOAD_PATH}`, () => {
					sent();
					return versionRejection();
				})
			);
			setup(<UploadView />);
			const dropzone = await screen.findByText(/nothing here/i);
			await uploadWithDnD(dropzone, createUploadDataTransfer([node]));
			expect(await screen.findByTestId(ICON_REGEXP.uploadFailed)).toBeVisible();
			expect(screen.queryByText(/quota exceeded/i)).not.toBeInTheDocument();
			expect(sent).toHaveBeenCalledTimes(1);
			await expect(getFilesApi()).resolves.toEqual({ edition: 'ce', version: '3.0.14' });
			expect(discovered.mock.calls.length).toBeGreaterThanOrEqual(2);
		});

		it('still shows the over quota feedback for a 422 without the version rejection code', async () => {
			const discovered = versionsSequence([older]);
			const localRoot = populateLocalRoot();
			const node = populateFile();
			node.parent = localRoot;
			server.use(
				http.post(`${REST_ENDPOINT}${UPLOAD_PATH}`, () =>
					HttpResponse.json(null, { status: HTTP_STATUS_CODE.overQuota })
				)
			);
			setup(<UploadView />);
			const dropzone = await screen.findByText(/nothing here/i);
			await uploadWithDnD(dropzone, createUploadDataTransfer([node]));
			expect(await screen.findByText(/Quota exceeded/i)).toBeVisible();
			await getFilesApi();
			expect(discovered).toHaveBeenCalledTimes(1);
		});

		it('rejects an upload to another module and negotiates again on the next call', async () => {
			const discovered = versionsSequence([older, newer]);
			server.use(http.post(`${REST_ENDPOINT}${UPLOAD_TO_PATH}`, () => versionRejection()));
			await expect(uploadToTargetModule({ nodeId: 'node', targetModule: 'MAILS' })).rejects.toEqual(
				{ statusText: expect.any(String), status: HTTP_STATUS_CODE.unprocessableEntity }
			);
			await expect(getFilesApi()).resolves.toEqual({ edition: 'ce', version: '3.0.14' });
			expect(discovered).toHaveBeenCalledTimes(2);
		});

		it('marks the upload of a version as failed without over quota', async () => {
			versionsSequence([older, newer]);
			const localRoot = populateLocalRoot();
			const fileVersion = populateFile();
			fileVersion.parent = localRoot;
			fileVersion.permissions.can_write_file = true;
			server.use(http.post(`${REST_ENDPOINT}${UPLOAD_VERSION_PATH}`, () => versionRejection()));
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
			expect(await screen.findByTestId(ICON_REGEXP.uploadFailed)).toBeVisible();
			expect(screen.queryByText(/quota exceeded/i)).not.toBeInTheDocument();
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
