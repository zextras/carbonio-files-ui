/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { getPreviewOutputFormat, isSupportedByPreview } from './previewUtils';
import { PREVIEW_TYPE } from '../constants';

jest.mock<typeof import('./previewUtils')>('./previewUtils', () => {
	const actual = jest.requireActual('./previewUtils');
	return {
		...actual,
		MIME_TYPE_PREVIEW_SUPPORT: {
			'image/svg+xml': {
				preview: true,
				thumbnail: true,
				thumbnail_detail: true
			},
			image: {
				preview: true,
				thumbnail: true,
				thumbnail_detail: true
			},
			'application/pdf': {
				preview: true,
				thumbnail: false,
				thumbnail_detail: false
			}
		}
	};
});

describe('Preview utils', () => {
	describe('isSupportedByPreview', () => {
		test('should return support and type for mime type entry if both specific and general are present', () => {
			const result = isSupportedByPreview('image/svg+xml', 'thumbnail');
			expect(result[0]).toBe(true);
			expect(result[1]).toBe(PREVIEW_TYPE.IMAGE);
		});

		test('should return support and type for general type entry if no entry for mime type is present', () => {
			const result = isSupportedByPreview('image/png', 'thumbnail');
			expect(result[0]).toBe(true);
			expect(result[1]).toBe(PREVIEW_TYPE.IMAGE);
		});

		test('should return support and type for mime type entry if only mime type is present', () => {
			const result = isSupportedByPreview('application/pdf', 'thumbnail');
			expect(result[0]).toBe(false);
			expect(result[1]).toBe(undefined);
		});

		test('should return no support if both mime type and general type entries are not present', () => {
			const result = isSupportedByPreview('text/plain', 'thumbnail');
			expect(result[0]).toBe(false);
			expect(result[1]).toBe(undefined);
		});
	});

	describe('getPreviewOutputFormat', () => {
		it('should return gif if mime type is image/gif', () => {
			const result = getPreviewOutputFormat('image/gif');
			expect(result).toBe('gif');
		});

		it('should return png if mime type is image/png', () => {
			const result = getPreviewOutputFormat('image/png');
			expect(result).toBe('png');
		});

		it.each(['image/jpg', 'image/jpeg', 'any/other', 'image/svg'])(
			'should return jpeg if mime type is not image/gif or image/png',
			(mimeType) => {
				const result = getPreviewOutputFormat(mimeType);
				expect(result).toBe('jpeg');
			}
		);
	});
});
