/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { http, HttpResponse } from 'msw';

import { FilesApiServerVersions } from './filesApiVersion';
import server from '../../mocks/server';
import { uploadVar } from '../apollo/uploadVar';
import { FILES_API_VERSIONS_PATH, REST_ENDPOINT, UPLOAD_PATH } from '../constants';
import { versionsResponse } from '../mocks/handleVersionsRequest';
import { populateFile, populateLocalRoot } from '../mocks/mockUtils';
import { createUploadDataTransfer, screen, setup, uploadWithDnD } from '../tests/utils';
import { UploadStatus } from '../types/graphql/client-types';
import UploadView from '../views/UploadView';

type SentHeaders = { destinationId: string | null; parentId: string | null };

async function uploadOn(
	versions: FilesApiServerVersions,
	answer: (nodeId: string) => Record<string, unknown>
): Promise<{ sent: SentHeaders[]; nodeId: string; folderId: string }> {
	const localRoot = populateLocalRoot();
	const node = populateFile();
	node.parent = localRoot;
	const nodeId = faker.string.uuid();
	const sent: SentHeaders[] = [];
	server.use(
		http.get(`${REST_ENDPOINT}${FILES_API_VERSIONS_PATH}`, () =>
			HttpResponse.json(versionsResponse(versions))
		),
		http.post(`${REST_ENDPOINT}${UPLOAD_PATH}`, ({ request }) => {
			sent.push({
				destinationId: request.headers.get('DestinationId'),
				parentId: request.headers.get('ParentId')
			});
			return HttpResponse.json(answer(nodeId));
		})
	);
	setup(<UploadView />);
	const dropzone = await screen.findByText(/nothing here/i);
	await uploadWithDnD(dropzone, createUploadDataTransfer([node]));
	await vi.waitFor(() =>
		expect(Object.values(uploadVar()).map((item) => item.status)).toEqual([UploadStatus.COMPLETED])
	);
	return { sent, nodeId, folderId: localRoot.id };
}

describe('Upload and the Files API version', () => {
	it('sends DestinationId and reads node_id from a CE server that has the change', async () => {
		const { sent, nodeId, folderId } = await uploadOn(
			{ edition: 'ce', current: '3.0.15-187.abc1234-SNAPSHOT', oldestSupported: '3.0.14' },
			(id) => ({ node_id: id, version: 1 })
		);
		expect(sent).toEqual([{ destinationId: folderId, parentId: null }]);
		expect(Object.values(uploadVar()).map((item) => item.nodeId)).toEqual([nodeId]);
	});

	it('sends DestinationId and reads node_id from a local CE backend', async () => {
		const { sent, nodeId, folderId } = await uploadOn(
			{ edition: 'ce', current: '3.0.14-SNAPSHOT', oldestSupported: '3.0.14' },
			(id) => ({ node_id: id, version: 1 })
		);
		expect(sent).toEqual([{ destinationId: folderId, parentId: null }]);
		expect(Object.values(uploadVar()).map((item) => item.nodeId)).toEqual([nodeId]);
	});

	it('sends ParentId and reads nodeId from a CE server before the change', async () => {
		const { sent, nodeId, folderId } = await uploadOn(
			{ edition: 'ce', current: '3.0.14', oldestSupported: '3.0.14' },
			(id) => ({ nodeId: id })
		);
		expect(sent).toEqual([{ destinationId: null, parentId: folderId }]);
		expect(Object.values(uploadVar()).map((item) => item.nodeId)).toEqual([nodeId]);
	});

	it('sends ParentId to Advanced, which has no such change', async () => {
		const { sent, nodeId, folderId } = await uploadOn(
			{ edition: 'advanced', current: '4.0.15-3.def5678-SNAPSHOT', oldestSupported: '4.0.14' },
			(id) => ({ nodeId: id })
		);
		expect(sent).toEqual([{ destinationId: null, parentId: folderId }]);
		expect(Object.values(uploadVar()).map((item) => item.nodeId)).toEqual([nodeId]);
	});
});
