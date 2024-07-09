/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import {
	CreateDocsFileRequestBody,
	CreateDocsFileResponse,
	useCreateDocsFile
} from './useCreateDocsFile';
import server from '../../mocks/server';
import { CREATE_FILE_PATH, DOCS_ENDPOINT } from '../constants';
import { populateFile, populateLocalRoot } from '../mocks/mockUtils';
import { setupHook } from '../tests/utils';
import { DocsType } from '../types/common';
import { Resolvers } from '../types/graphql/resolvers-types';
import { mockGetNode } from '../utils/resolverMocks';

describe('useCreateDocsFile', () => {
	it('should make the request with the content-type header set to application/json', async () => {
		let headers: Headers | undefined;
		const node = populateFile();
		const mocks = {
			Query: {
				getNode: mockGetNode({ getNode: [node] })
			}
		} satisfies Partial<Resolvers>;
		server.use(
			http.post<never, CreateDocsFileRequestBody, CreateDocsFileResponse>(
				`${DOCS_ENDPOINT}${CREATE_FILE_PATH}`,
				(info) => {
					headers = info.request.headers;
					return HttpResponse.json({
						nodeId: node.id
					});
				}
			)
		);
		const { result } = setupHook(() => useCreateDocsFile(), { mocks });
		await result.current(populateLocalRoot(), 'test', DocsType.LIBRE_DOCUMENT);
		await waitFor(() => expect(headers).toBeDefined());
		expect(headers?.get('Content-Type')).toBe('application/json');
	});
});
