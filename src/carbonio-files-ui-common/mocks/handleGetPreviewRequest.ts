/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { HttpResponse, HttpResponseResolver, PathParams, StrictResponse } from 'msw';

import { PREVIEW_TYPE } from '../constants';

interface GetPreviewParams extends PathParams {
	type: (typeof PREVIEW_TYPE)[keyof typeof PREVIEW_TYPE];
	id: string;
	version: string;
	area: string;
	thumbnail: 'thumbnail' | '';
}

const handleGetPreviewRequest: HttpResponseResolver<GetPreviewParams, never, ArrayBuffer> = async ({
	params
}) => {
	const { type, id, thumbnail } = params;
	if (thumbnail || type === PREVIEW_TYPE.IMAGE) {
		const image = await fetch(faker.image.url()).then((response) => response.arrayBuffer());
		return HttpResponse.arrayBuffer(image, {
			headers: {
				'Content-Length': image.byteLength.toString(),
				'Content-Type': 'image/png'
			}
		}) as StrictResponse<ArrayBuffer>;
	}
	if (type === PREVIEW_TYPE.PDF || type === PREVIEW_TYPE.DOCUMENT) {
		const mimeType =
			type === PREVIEW_TYPE.PDF ? 'application/pdf' : 'application/vnd.oasis.opendocument.text';
		const file = await new File(['(⌐□_□)'], id, {
			type: mimeType
		}).arrayBuffer();
		return HttpResponse.arrayBuffer(file, {
			headers: {
				'Content-Length': file.byteLength.toString(),
				'Content-Type': mimeType
			}
		}) as StrictResponse<ArrayBuffer>;
	}
	return HttpResponse.arrayBuffer(undefined, {
		status: 400,
		statusText: 'wrong type'
	}) as StrictResponse<ArrayBuffer>;
};

export default handleGetPreviewRequest;
