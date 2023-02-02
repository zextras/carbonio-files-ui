/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { ResponseResolver, RestContext, RestRequest } from 'msw';

import { PREVIEW_TYPE } from '../constants';

type GetPreviewParams = {
	type: typeof PREVIEW_TYPE[keyof typeof PREVIEW_TYPE];
	id: string;
	version: string;
	area: string;
	thumbnail?: 'thumbnail';
};

const handleGetPreviewRequest: ResponseResolver<
	RestRequest<never, GetPreviewParams>,
	RestContext,
	ArrayBuffer
> = async (req, res, ctx) => {
	const { type, id, thumbnail } = req.params;
	if (thumbnail || type === PREVIEW_TYPE.IMAGE) {
		const image = await fetch(faker.image.business()).then((response) => response.arrayBuffer());
		return res(
			ctx.set('Content-Length', image.byteLength.toString()),
			ctx.set('Content-Type', 'image/png'),
			ctx.body(image)
		);
	}
	if (type === PREVIEW_TYPE.PDF || type === PREVIEW_TYPE.DOCUMENT) {
		const mimeType =
			type === PREVIEW_TYPE.PDF ? 'application/pdf' : 'application/vnd.oasis.opendocument.text';
		const file = await new File(['(⌐□_□)'], id, {
			type: mimeType
		}).arrayBuffer();
		return res(
			ctx.set('Content-Length', file.byteLength.toString()),
			ctx.set('Content-Type', mimeType),
			ctx.body(file)
		);
	}
	return res(ctx.status(400, 'wrong type'));
};

export default handleGetPreviewRequest;
