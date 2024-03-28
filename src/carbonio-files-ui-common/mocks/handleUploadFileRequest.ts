/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { HttpResponse, HttpResponseResolver, PathParams } from 'msw';

export interface UploadResponse {
	nodeId: string;
}

export interface UploadRequestParams extends PathParams {
	Filename: string;
	Description: string | '';
	ParentId: string | '';
}

export interface UploadRequestBody {
	file: File;
}

const handleUploadFileRequest: HttpResponseResolver<
	UploadRequestParams,
	UploadRequestBody,
	UploadResponse
> = () =>
	HttpResponse.json({
		nodeId: faker.string.uuid()
	});

export default handleUploadFileRequest;
