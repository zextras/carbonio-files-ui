/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { HttpResponse, HttpResponseResolver, PathParams } from 'msw';

export interface UploadVersionResponse {
	nodeId: string;
	version: number;
}

export interface UploadVersionRequestParams extends PathParams {
	Filename: string;
	NodeId: string;
	OverwriteVersion: string;
}

export interface UploadRequestBody {
	file: File;
}

const handleUploadFileRequest: HttpResponseResolver<
	UploadVersionRequestParams,
	UploadRequestBody,
	UploadVersionResponse
> = () =>
	HttpResponse.json({
		nodeId: faker.string.uuid(),
		version: faker.number.int(1)
	});

export default handleUploadFileRequest;
