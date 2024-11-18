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

const pdfData = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144]
/Contents 4 0 R /Resources << >>
>>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 24 Tf
100 100 Td
(This is a test PDF.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000079 00000 n
0000000175 00000 n
0000000307 00000 n
trailer
<< /Root 1 0 R /Size 5 >>
startxref
379
%%EOF`;

function pdfToArrayBuffer(pdf: string): ArrayBufferLike {
	const binaryString = atob(pdf);
	const len = binaryString.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i += 1) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

const handleGetPreviewRequest: HttpResponseResolver<GetPreviewParams, never, ArrayBuffer> = async ({
	params
}) => {
	const { type, thumbnail } = params;
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
		const mimeType = 'application/pdf';
		const arrayBuffer = pdfToArrayBuffer(btoa(pdfData));
		return HttpResponse.arrayBuffer(arrayBuffer, {
			headers: {
				'Content-Length': arrayBuffer.byteLength.toString(),
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
