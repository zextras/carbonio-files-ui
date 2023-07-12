/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { isSupportedByPreview } from './previewUtils';
import { PREVIEW_TYPE } from '../constants';

jest.mock<typeof import('./previewUtils')>('./previewUtils', () => {
	const actual = jest.requireActual('./previewUtils');
	return {
		...actual,
		MIME_TYPE_PREVIEW_SUPPORT: {
			'image/svg+xml': {
				preview: false,
				thumbnail: false,
				thumbnail_detail: false
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
			expect(result[0]).toBe(false);
			expect(result[1]).toBe(undefined);
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
});
