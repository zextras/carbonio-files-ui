/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { ResponseResolver, RestContext, RestRequest } from 'msw';

import { DocsType } from '../types/common';

export interface CreateDocsFileResponse {
	nodeId: string | null;
}

export interface CreateDocsFileRequestBody {
	filename: string;
	destinationFolderId: string;
	type: DocsType;
}

const handleCreateDocsFileRequest: ResponseResolver<
	RestRequest<CreateDocsFileRequestBody>,
	RestContext,
	CreateDocsFileResponse
> = (req, res, ctx) =>
	res(
		ctx.json({
			nodeId: faker.datatype.uuid()
		})
	);

export default handleCreateDocsFileRequest;
