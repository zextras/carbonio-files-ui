/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { PathParams, ResponseResolver, RestContext, RestRequest } from 'msw';

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

const handleUploadFileRequest: ResponseResolver<
	RestRequest<UploadRequestBody, UploadRequestParams>,
	RestContext,
	UploadResponse
> = (req, res, ctx) =>
	res(
		ctx.json({
			nodeId: faker.datatype.uuid()
		})
	);

export default handleUploadFileRequest;
