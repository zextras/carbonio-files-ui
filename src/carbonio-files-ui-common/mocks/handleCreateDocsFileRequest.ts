/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { HttpResponse, HttpResponseResolver } from 'msw';

import { DocsType } from '../types/common';

export interface CreateDocsFileResponse {
	nodeId: string | null;
}

export interface CreateDocsFileRequestBody {
	filename: string;
	destinationFolderId: string;
	type: DocsType;
}

const handleCreateDocsFileRequest: HttpResponseResolver<
	never,
	CreateDocsFileRequestBody,
	CreateDocsFileResponse
> = () =>
	HttpResponse.json({
		nodeId: faker.string.uuid()
	});

export default handleCreateDocsFileRequest;
