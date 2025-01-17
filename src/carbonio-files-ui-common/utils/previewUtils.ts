/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { PREVIEW_PATH, PREVIEW_TYPE, REST_ENDPOINT } from '../constants';
import { File } from '../types/graphql/types';

type ThumbnailType = 'thumbnail' | 'thumbnail_detail';
type PreviewOptions = {
	width: number;
	height: number;
	version?: number;
	quality?: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
	outputFormat?: 'jpeg' | 'png' | 'gif';
};
type ThumbnailOptions = PreviewOptions & {
	shape?: 'rectangular' | 'rounded';
};

export const PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS = [
	'application/msword',
	'application/vnd.ms-excel',
	'application/vnd.ms-powerpoint',
	'application/vnd.oasis.opendocument.presentation',
	'application/vnd.oasis.opendocument.spreadsheet',
	'application/vnd.oasis.opendocument.text',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export function isPreviewDependantOnDocs(mimeType: string | undefined): boolean {
	return PREVIEW_MIME_TYPE_DEPENDANT_ON_DOCS.includes(mimeType ?? '');
}

export const MIME_TYPE_PREVIEW_SUPPORT: Record<
	string,
	Record<ThumbnailType | 'preview', boolean>
> = {
	'application/pdf': {
		thumbnail: false,
		thumbnail_detail: true,
		preview: true
	},
	'application/msword': {
		thumbnail: false,
		thumbnail_detail: false,
		preview: true
	},
	'application/vnd.ms-excel': {
		thumbnail: false,
		thumbnail_detail: false,
		preview: true
	},
	'application/vnd.ms-powerpoint': {
		thumbnail: false,
		thumbnail_detail: false,
		preview: true
	},
	'application/vnd.oasis.opendocument.presentation': {
		thumbnail: false,
		thumbnail_detail: false,
		preview: true
	},
	'application/vnd.oasis.opendocument.spreadsheet': {
		thumbnail: false,
		thumbnail_detail: false,
		preview: true
	},
	'application/vnd.oasis.opendocument.text': {
		thumbnail: false,
		thumbnail_detail: false,
		preview: true
	},
	'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
		thumbnail: false,
		thumbnail_detail: false,
		preview: true
	},
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
		thumbnail: false,
		thumbnail_detail: false,
		preview: true
	},
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
		thumbnail: false,
		thumbnail_detail: false,
		preview: true
	},
	'image/svg+xml': {
		thumbnail: true,
		thumbnail_detail: true,
		preview: true
	},
	image: {
		thumbnail: true,
		thumbnail_detail: true,
		preview: true
	}
} as const;

/**
 * Check if a file is supported by preview by its mime type
 *
 * [0]: tells whether the given mime type is supported or not
 *
 * [1]: if mime type is supported, tells which type of preview this mime type is associated to
 */
export function isSupportedByPreview(
	mimeType: string | undefined,
	type: ThumbnailType | 'preview'
): [boolean, (typeof PREVIEW_TYPE)[keyof typeof PREVIEW_TYPE] | undefined] {
	if (mimeType) {
		const isSupported =
			MIME_TYPE_PREVIEW_SUPPORT[mimeType]?.[type] ??
			MIME_TYPE_PREVIEW_SUPPORT[mimeType.split('/')[0]]?.[type] ??
			false;
		const previewType =
			(isSupported &&
				((mimeType.startsWith('image') && PREVIEW_TYPE.IMAGE) ||
					(mimeType.includes('pdf') && PREVIEW_TYPE.PDF) ||
					PREVIEW_TYPE.DOCUMENT)) ||
			undefined;
		return [isSupported, previewType];
	}
	return [false, undefined];
}

export function getImgPreviewSrc(id: string, options: PreviewOptions): string {
	const optionalParams = [];
	options.quality && optionalParams.push(`quality=${options.quality}`);
	options.outputFormat && optionalParams.push(`output_format=${options.outputFormat}`);
	options.version && optionalParams.push(`version=${options.version}`);
	return `${REST_ENDPOINT}${PREVIEW_PATH}/${PREVIEW_TYPE.IMAGE}/${id}/${options.width}x${
		options.height
	}?${optionalParams.join('&')}`;
}

export function getPdfPreviewSrc(id: string, version?: number): string {
	const queryParamsString = version ? `?version=${version}` : '';
	return `${REST_ENDPOINT}${PREVIEW_PATH}/${PREVIEW_TYPE.PDF}/${id}${queryParamsString}`;
}

export function getDocumentPreviewSrc(id: string, version?: number): string {
	const queryParamsString = version ? `?version=${version}` : '';
	return `${REST_ENDPOINT}${PREVIEW_PATH}/${PREVIEW_TYPE.DOCUMENT}/${id}${queryParamsString}`;
}

export function getPreviewOutputFormat(
	mimeType: string | undefined
): PreviewOptions['outputFormat'] {
	switch (mimeType) {
		case 'image/gif':
			return 'gif';
		case 'image/png':
		case 'image/svg+xml':
			return 'png';
		default:
			return 'jpeg';
	}
}

export function getPreviewSrc(
	node: Pick<File, 'id' | 'version' | 'mime_type'>,
	documentType: ReturnType<typeof isSupportedByPreview>[1]
): string {
	return (
		(node.version &&
			((documentType === PREVIEW_TYPE.PDF && getPdfPreviewSrc(node.id)) ||
				(documentType === PREVIEW_TYPE.DOCUMENT && getDocumentPreviewSrc(node.id)) ||
				(documentType === PREVIEW_TYPE.IMAGE &&
					getImgPreviewSrc(node.id, {
						width: 0,
						height: 0,
						quality: 'high',
						outputFormat: getPreviewOutputFormat(node.mime_type)
					})))) ||
		''
	);
}

export function getPreviewThumbnailSrc(
	id: string,
	mimeType: string | undefined,
	options: ThumbnailOptions,
	thumbnailType: ThumbnailType
): string | undefined {
	const [isSupported, previewType] = isSupportedByPreview(mimeType, thumbnailType);
	if (mimeType && isSupported) {
		const optionalParams = [];
		options.shape && optionalParams.push(`shape=${options.shape}`);
		options.quality && optionalParams.push(`quality=${options.quality}`);
		options.outputFormat && optionalParams.push(`output_format=${options.outputFormat}`);
		options.version && optionalParams.push(`version=${options.version}`);
		const optionalParamsStr = (optionalParams.length > 0 && `?${optionalParams.join('&')}`) || '';
		return `${REST_ENDPOINT}${PREVIEW_PATH}/${previewType}/${id}/${options.width}x${options.height}/thumbnail${optionalParamsStr}`;
	}
	return undefined;
}
