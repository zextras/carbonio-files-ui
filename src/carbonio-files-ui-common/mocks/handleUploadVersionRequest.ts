/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { PathParams, ResponseResolver, RestContext, RestRequest } from 'msw';

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

const handleUploadFileRequest: ResponseResolver<
	RestRequest<UploadRequestBody, UploadVersionRequestParams>,
	RestContext,
	UploadVersionResponse
> = (req, res, ctx) =>
	res(
		ctx.json({
			nodeId: faker.datatype.uuid(),
			version: faker.datatype.number(1)
		})
	);

export default handleUploadFileRequest;
