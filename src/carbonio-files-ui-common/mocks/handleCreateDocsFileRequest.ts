/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { HttpResponse, HttpResponseResolver } from 'msw';

import { CreateDocsFileRequestBody, CreateDocsFileResponse } from '../hooks/useCreateDocsFile';

const handleCreateDocsFileRequest: HttpResponseResolver<
	never,
	CreateDocsFileRequestBody,
	CreateDocsFileResponse
> = () =>
	HttpResponse.json({
		nodeId: faker.string.uuid()
	});

export default handleCreateDocsFileRequest;
