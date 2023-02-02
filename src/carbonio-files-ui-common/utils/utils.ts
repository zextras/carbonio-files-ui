/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { ApolloError } from '@apollo/client';
import { Location } from 'history';
import {
	chain,
	forEach,
	map,
	includes,
	reduce,
	size,
	debounce,
	findIndex,
	first,
	toLower,
	trim
} from 'lodash';
import moment, { Moment } from 'moment-timezone';
import { TFunction } from 'react-i18next';

import { searchParamsVar } from '../apollo/searchVar';
import {
	DOCS_ENDPOINT,
	DOCS_EXTENSIONS,
	DOWNLOAD_PATH,
	INTERNAL_PATH,
	OPEN_FILE_PATH,
	PREVIEW_PATH,
	PREVIEW_TYPE,
	REST_ENDPOINT,
	ROOTS,
	UPLOAD_TO_PATH
} from '../constants';
import {
	Contact,
	Crumb,
	CrumbNode,
	DocsType,
	OrderTrend,
	OrderType,
	Role,
	SortableNode,
	TargetModule
} from '../types/common';
import {
	File,
	Folder,
	Maybe,
	Node,
	NodeSort,
	NodeType,
	SharePermission
} from '../types/graphql/types';

/**
 * Format a size in byte as human-readable
 */
export const humanFileSize = (inputSize: number): string => {
	if (inputSize === 0) {
		return '0 B';
	}
	const i = Math.floor(Math.log(inputSize) / Math.log(1024));
	return `${(inputSize / 1024 ** i).toFixed(2).toString()} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
};

/**
 * Given a file type returns the DS icon name
 */
export const getIconByFileType = (type: NodeType, subType?: Maybe<string>): string => {
	switch (type) {
		case NodeType.Folder:
			return 'Folder';
		case NodeType.Text:
			return 'FileText';
		case NodeType.Video:
			return 'Video';
		case NodeType.Audio:
			return 'Music';
		case NodeType.Image:
			return 'Image';
		case NodeType.Message:
			return 'Email';
		case NodeType.Presentation:
			return 'FilePresentation';
		case NodeType.Spreadsheet:
			return 'FileCalc';
		case NodeType.Application:
			return 'Code';
		case NodeType.Root: {
			switch (subType) {
				case ROOTS.LOCAL_ROOT:
					return 'Home';
				case ROOTS.TRASH:
					return 'Trash2';
				case ROOTS.SHARED_WITH_ME:
					return 'Share';
				default:
					return 'File';
			}
		}
		default:
			return 'File';
	}
};

const buildCrumbsRecursive = (
	node: CrumbNode,
	clickHandler?: (id: string, event: React.SyntheticEvent | KeyboardEvent) => void,
	t?: TFunction,
	nodeClickCondition: (node: Pick<Node, 'id' | 'name' | 'type'>) => boolean = (): boolean => true
): Crumb[] => {
	let result: Crumb[] = [];
	if (node.parent) {
		result = buildCrumbsRecursive(node.parent, clickHandler, t);
	}

	let handlerFunction;
	if (clickHandler && node && nodeClickCondition(node)) {
		handlerFunction = (event: React.SyntheticEvent | KeyboardEvent): void =>
			clickHandler(node.id, event);
	}
	if (node.name) {
		result.push({
			id: node.id,
			// be careful: the following key is not parsed by i18next-extract purposely
			/* i18next-extract-disable-next-line */
			label: (t && t('node.alias.name', node.name, { context: node.id })) || node.name,
			click: handlerFunction
		});
	}
	return result;
};

/**
 * Build the crumbs for a node formatted as required by @zextras/carbonio-design-system Breadcrumb.
 * @param nodes - each node should contain properties id, name and parent (optional, not considered if nodes is an array)
 * @param clickHandler - callback that handles the click on the breadcrumb item. It receives the node id as a param
 * @param t - translation function
 * @param nodeClickCondition - validation click function
 */
export const buildCrumbs = (
	nodes: CrumbNode | Array<Maybe<Pick<Node, 'id' | 'name' | 'type'>> | undefined>,
	clickHandler?: (id: string, event: React.SyntheticEvent | KeyboardEvent) => void,
	t?: TFunction,
	nodeClickCondition: (node: Pick<Node, 'id' | 'name' | 'type'>) => boolean = (): boolean => true
): Crumb[] => {
	if (nodes instanceof Array) {
		// the array can contain null if path is requested for a node with no accessible parent
		return chain(nodes)
			.filter((node) => !!node)
			.map((node) => {
				const $node = node as Node;
				return {
					id: $node.id,
					// be careful: the following key is not parsed by i18next-extract purposely
					/* i18next-extract-disable-next-line */
					label: (t && t('node.alias.name', $node.name, { context: $node.id })) || $node.name,
					click:
						node && clickHandler && nodeClickCondition(node)
							? (event: React.SyntheticEvent | KeyboardEvent): void => clickHandler($node.id, event)
							: undefined
				};
			})
			.value();
	}

	return nodes ? buildCrumbsRecursive(nodes, clickHandler, t, nodeClickCondition) : [];
};

export const formatDate = (
	date?: Moment | Date | string | number,
	format?: string,
	zimbraPrefTimeZoneId?: string
): string => {
	if (!date) {
		return '';
	}
	// TODO manage locale
	let $format = format;
	if (!$format) {
		$format = 'DD/MM/YY';
	}
	if (zimbraPrefTimeZoneId) {
		return moment(date).tz(zimbraPrefTimeZoneId).format($format);
	}
	return moment(date).format($format);
};

export const formatTime = (
	date: Moment | Date | string | number,
	zimbraPrefTimeZoneId?: string
): string => {
	if (zimbraPrefTimeZoneId) {
		return moment(date).tz(zimbraPrefTimeZoneId).format('HH.mm A');
	}
	// TODO manage locale
	return moment(date).format('HH.mm A');
};

export const removeTimezoneOffset = (date: Date): number => {
	const userTimezoneOffset = date.getTimezoneOffset() * 60000;
	return date.getTime() - userTimezoneOffset;
};

export const initExpirationDate = (date: Date | undefined): Date | undefined => {
	if (date) {
		const epoch = removeTimezoneOffset(date);
		// add 23 hours and 59 minutes
		const epochPlusOneDay = epoch + 24 * 60 * 60 * 1000 - 60000;
		return new Date(epochPlusOneDay);
	}
	return undefined;
};

/**
 * Decode an Apollo Error in a string message
 */
export const decodeError = (error: ApolloError, t: TFunction): string | null => {
	if (error) {
		let errorMsg;
		if (error.graphQLErrors && size(error.graphQLErrors) > 0) {
			const err = first(error.graphQLErrors);
			if (err?.extensions?.errorCode) {
				return t('errorCode.code', 'Something went wrong', { context: err.extensions.errorCode });
			}
			if (err?.message) {
				errorMsg = err?.message;
			}
		}
		if (error.networkError && 'result' in error.networkError) {
			const netError = map(
				error.networkError.result,
				(err) => err.extensions?.code || err.message
			).join('\n');
			errorMsg = errorMsg ? errorMsg + netError : netError;
		}
		return errorMsg || (error.message ? error.message : '');
	}
	return null;
};

export const getChipLabel = (contact: Contact | null | undefined): string => {
	if (!contact) {
		return '';
	}
	if (contact.firstName || contact.middleName || contact.lastName) {
		return trim(`${contact.firstName ?? ''} ${contact.middleName ?? ''} ${contact.lastName ?? ''}`);
	}
	return contact.full_name || contact.fullName || contact.email || contact.name || '';
};

export const getChipTooltip = (contact: Contact | null | undefined): string => {
	if (!contact) {
		return '';
	}
	return contact.email || '';
};

/**
 * Utility to copy text to clipboard
 */
export const copyToClipboard = (text: string): Promise<void> => {
	if (!window.parent.navigator.clipboard) {
		const textArea = window.parent.document.createElement('textarea');
		window.parent.document.body.appendChild(textArea);
		textArea.value = text;
		textArea.select();
		const success = window.parent.document.execCommand('copy');
		window.parent.document.body.removeChild(textArea);
		return new Promise<void>((resolve, reject) => {
			success ? resolve() : reject();
		});
	}

	return window.parent.navigator.clipboard.writeText(text);
};

export const downloadNode = (id: string, version?: number): void => {
	if (id) {
		const url = `${REST_ENDPOINT}${DOWNLOAD_PATH}/${encodeURIComponent(id)}${
			version ? `/${version}` : ''
		}`;
		const a = document.createElement('a');
		if (a) {
			a.download = url;
			a.href = url;
			a.target = '_blank';
			a.type = 'hidden';
			a.click();
		}
	}
};

const docsTabMap: { [url: string]: Window } = {};

/**
 * Open with docs
 */
export const openNodeWithDocs = (id: string, version?: number): void => {
	if (id) {
		const url = `${DOCS_ENDPOINT}${OPEN_FILE_PATH}/${encodeURIComponent(id)}${
			version ? `?version=${version}` : ''
		}`;
		if (docsTabMap[url] == null || (docsTabMap[url] != null && docsTabMap[url].closed)) {
			docsTabMap[url] = window.open(url, url) as Window;
		} else {
			docsTabMap[url].focus();
		}
	}
};

export const inputElement = ((): HTMLInputElement => {
	const input = document.createElement('input');
	if (input) {
		input.type = 'file';
		input.multiple = true;
		input.hidden = true;
	}
	return input;
})();

export const scrollToNodeItem = debounce((nodeId: string, isLast = false) => {
	if (nodeId) {
		const element = window.document.getElementById(nodeId);
		if (element) {
			let options: ScrollIntoViewOptions = { block: 'center' };
			// if last element, leave it at the end of the screen to not trigger loadMore
			if (isLast) {
				options = { ...options, block: 'end' };
			}
			element.scrollIntoView(options);
		}
	}
}, 500);

export function propertyComparator<T extends SortableNode[keyof SortableNode]>(
	a: Maybe<SortableNode> | undefined,
	b: Maybe<SortableNode> | undefined,
	property: keyof SortableNode,
	{
		defaultIfNull,
		propertyModifier
	}: {
		defaultIfNull?: T;
		propertyModifier?: (p: NonNullable<T>) => NonNullable<T>;
	} = {}
): number {
	let propA = (a == null || a[property] == null ? defaultIfNull : (a[property] as T)) || null;
	let propB = (b == null || b[property] == null ? defaultIfNull : (b[property] as T)) || null;
	if (propA === propB) {
		return 0;
	}
	if (propA === null) {
		return -1;
	}
	if (propB === null) {
		return 1;
	}
	if (propertyModifier) {
		propA = propertyModifier(propA);
		propB = propertyModifier(propB);
		// check again equality after modifier
		if (propA === propB) {
			return 0;
		}
	}
	return propA < propB ? -1 : 1;
}

export function nodeSortComparator(
	a: Maybe<SortableNode> | undefined,
	b: Maybe<SortableNode> | undefined,
	sortsList: NodeSort[]
): number {
	let sortIndex = 0;
	let comparatorResult = 0;
	while (comparatorResult === 0 && sortIndex < sortsList.length) {
		switch (sortsList[sortIndex]) {
			case NodeSort.NameAsc:
				comparatorResult = propertyComparator<string>(a, b, 'name', { propertyModifier: toLower });
				break;
			case NodeSort.NameDesc:
				comparatorResult = propertyComparator<string>(b, a, 'name', { propertyModifier: toLower });
				break;
			case NodeSort.TypeAsc:
				if ((!a || !a.type) && (!b || !b.type)) {
					comparatorResult = 0;
				} else if (!a || !a.type) {
					comparatorResult = -1;
				} else if (!b || !b.type) {
					comparatorResult = 1;
				} else if (a.type === NodeType.Folder && b.type !== NodeType.Folder) {
					comparatorResult = -1;
				} else if (a.type !== NodeType.Folder && b.type === NodeType.Folder) {
					comparatorResult = 1;
				} else {
					comparatorResult = 0;
				}
				break;
			case NodeSort.TypeDesc:
				if ((!a || !a.type) && (!b || !b.type)) {
					comparatorResult = 0;
				} else if (!a || !a.type) {
					comparatorResult = 1;
				} else if (!b || !b.type) {
					comparatorResult = -1;
				} else if (a.type === NodeType.Folder && b.type !== NodeType.Folder) {
					comparatorResult = 1;
				} else if (a.type !== NodeType.Folder && b.type === NodeType.Folder) {
					comparatorResult = -1;
				} else {
					comparatorResult = 0;
				}
				break;
			case NodeSort.UpdatedAtAsc:
				comparatorResult = propertyComparator<number>(a, b, 'updated_at');
				break;
			case NodeSort.UpdatedAtDesc:
				comparatorResult = propertyComparator<number>(b, a, 'updated_at');
				break;
			case NodeSort.SizeAsc:
				comparatorResult = propertyComparator<number>(a, b, 'size', { defaultIfNull: 0 });
				break;
			case NodeSort.SizeDesc:
				comparatorResult = propertyComparator<number>(b, a, 'size', { defaultIfNull: 0 });
				break;
			default:
				comparatorResult = propertyComparator<string>(a, b, 'name', { propertyModifier: toLower });
				break;
		}
		sortIndex += 1;
	}
	return comparatorResult;
}

export function addNodeInSortedList(
	nodes: Array<Maybe<SortableNode> | undefined>,
	node: Maybe<SortableNode>,
	sort: NodeSort
): number {
	const sortsList =
		sort === NodeSort.SizeAsc || sort === NodeSort.SizeDesc ? [sort] : [NodeSort.TypeAsc, sort];
	return findIndex(nodes, (listNode) => nodeSortComparator(node, listNode, sortsList) < 0);
}

export function isSearchView(location: Location): boolean {
	return location.pathname.includes(INTERNAL_PATH.SEARCH);
}

export function isTrashView(params: { filter?: string }): boolean {
	return params.filter === 'myTrash' || params.filter === 'sharedTrash';
}

export function isTrashedVisible(params: { filter?: string }, location: Location): boolean {
	const searchParams = searchParamsVar();
	return (
		isTrashView(params) ||
		(isSearchView(location) &&
			(!searchParams.folderId?.value || searchParams.folderId.value === ROOTS.TRASH))
	);
}

export function sharePermissionsGetter(role: Role, sharingAllowed: boolean): SharePermission {
	if (role === Role.Viewer && sharingAllowed) {
		return SharePermission.ReadAndShare;
	}
	if (role === Role.Viewer && !sharingAllowed) {
		return SharePermission.ReadOnly;
	}
	if (role === Role.Editor && sharingAllowed) {
		return SharePermission.ReadWriteAndShare;
	}
	if (role === Role.Editor && !sharingAllowed) {
		return SharePermission.ReadAndWrite;
	}
	throw new Error();
}

export function nodeSortGetter(order: OrderTrend, orderType: OrderType): NodeSort {
	if (order === OrderTrend.Ascending && orderType === OrderType.Name) {
		return NodeSort.NameAsc;
	}
	if (order === OrderTrend.Ascending && orderType === OrderType.UpdatedAt) {
		return NodeSort.UpdatedAtAsc;
	}
	if (order === OrderTrend.Ascending && orderType === OrderType.Size) {
		return NodeSort.SizeAsc;
	}
	if (order === OrderTrend.Descending && orderType === OrderType.Name) {
		return NodeSort.NameDesc;
	}
	if (order === OrderTrend.Descending && orderType === OrderType.UpdatedAt) {
		return NodeSort.UpdatedAtDesc;
	}
	if (order === OrderTrend.Descending && orderType === OrderType.Size) {
		return NodeSort.SizeDesc;
	}
	throw new Error();
}

export function getInverseOrder(order: OrderTrend): OrderTrend {
	if (order === OrderTrend.Ascending) {
		return OrderTrend.Descending;
	}
	return OrderTrend.Ascending;
}

export function hexToRGBA(hexColor: string, alpha = 1): string {
	let r = '0';
	let g = '0';
	let b = '0';

	// 3 digits
	if (hexColor.length === 4) {
		r = `0x${hexColor[1]}${hexColor[1]}`;
		g = `0x${hexColor[2]}${hexColor[2]}`;
		b = `0x${hexColor[3]}${hexColor[3]}`;
	} else if (hexColor.length === 7) {
		// 6 digits
		r = `0x${hexColor[1]}${hexColor[2]}`;
		g = `0x${hexColor[3]}${hexColor[4]}`;
		b = `0x${hexColor[5]}${hexColor[6]}`;
	} else {
		return hexColor;
	}

	return `rgba(${+r},${+g},${+b},${+alpha})`;
}

export function encodeBase64(str: string): string {
	// took from https://stackoverflow.com/a/30106551/17280436
	// window.btoa is not enough for cyrillic
	// see also https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
	return window.btoa(
		encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
			String.fromCharCode(parseInt(p1, 16))
		)
	);
}

export const docsHandledMimeTypes = [
	'text/rtf',
	'text/plain',
	'application/msword',
	'application/rtf',
	'application/vnd.lotus-wordpro',
	'application/vnd.ms-excel',
	'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
	'application/vnd.ms-excel.sheet.macroEnabled.12',
	'application/vnd.ms-excel.template.macroEnabled.12',
	'application/vnd.ms-powerpoint',
	'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
	'application/vnd.ms-powerpoint.template.macroEnabled.12',
	'application/vnd.ms-word.document.macroEnabled.12',
	'application/vnd.ms-word.template.macroEnabled.12',
	'application/vnd.oasis.opendocument.presentation',
	'application/vnd.oasis.opendocument.presentation-flat-xml',
	'application/vnd.oasis.opendocument.spreadsheet',
	'application/vnd.oasis.opendocument.text',
	'application/vnd.oasis.opendocument.text-flat-xml',
	'application/vnd.oasis.opendocument.text-master',
	'application/vnd.oasis.opendocument.text-master-template',
	'application/vnd.oasis.opendocument.text-template',
	'application/vnd.oasis.opendocument.text-web',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'application/vnd.openxmlformats-officedocument.presentationml.template',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
	'application/vnd.sun.xml.calc',
	'application/vnd.sun.xml.calc.template',
	'application/vnd.sun.xml.impress',
	'application/vnd.sun.xml.impress.template',
	'application/vnd.sun.xml.writer',
	'application/vnd.sun.xml.writer.global',
	'application/vnd.sun.xml.writer.template'
];

export const previewHandledMimeTypes: string[] = [
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

export const thumbnailHandledMimeTypes: string[] = [];

/**
 * 	Error codes:
 *	400 if target  does not match
 *  404 if nodeId does not exist
 *  413 if payload is Too Large
 *  500 if the store does not respond
 */
const uploadToCompleted = (
	xhr: XMLHttpRequest,
	resolve: (value: { attachmentId: string } | PromiseLike<{ attachmentId: string }>) => void,
	reject: (reason?: { statusText: string; status: number }) => void
): void => {
	switch (xhr.status) {
		case 200: {
			const response = JSON.parse(xhr.response);
			resolve({ attachmentId: response.attachmentId });
			break;
		}
		case 400:
		case 404:
		case 413:
		case 500:
		default: {
			reject({ statusText: xhr.statusText, status: xhr.status });
		}
	}
};

async function readEntries(
	directoryReader: FileSystemDirectoryReader
): Promise<Array<FileSystemEntry>> {
	return new Promise<Array<FileSystemEntry>>((resolve, reject) => {
		directoryReader.readEntries((entries): void => {
			resolve(entries);
		}, reject);
	});
}

interface FileSystemDirectoryEntryWithChildren extends FileSystemDirectoryEntry {
	children?: Array<TreeNode>;
}

export type TreeNode = FileSystemFileEntry | FileSystemDirectoryEntryWithChildren;

export function isFileSystemFileEntry(entry: FileSystemEntry): entry is FileSystemFileEntry {
	return entry.isFile;
}

export function isFileSystemDirectoryEntry(
	entry: FileSystemEntry
): entry is FileSystemDirectoryEntry {
	return entry.isDirectory;
}

export async function scan(item: FileSystemEntry): Promise<TreeNode> {
	if (isFileSystemFileEntry(item)) {
		return item;
	}
	if (isFileSystemDirectoryEntry(item)) {
		const directoryReader = item.createReader();
		let flag = true;
		const entries: Array<FileSystemEntry> = [];
		while (flag) {
			// https://eslint.org/docs/latest/rules/no-await-in-loop#:~:text=In%20many%20cases%20the%20iterations%20of%20a%20loop%20are%20not%20actually%20independent%20of%20each%2Dother.%20For%20example%2C%20the%20output%20of%20one%20iteration%20might%20be%20used%20as%20the%20input%20to%20another
			// eslint-disable-next-line no-await-in-loop
			const newEntries = await readEntries(directoryReader);
			if (size(newEntries) === 0) {
				flag = false;
			} else {
				entries.push(...newEntries);
			}
		}
		const treeNodes = await Promise.all(map(entries, (entry) => scan(entry)));
		const returnValue: FileSystemDirectoryEntryWithChildren = item;
		returnValue.children = treeNodes;
		return returnValue;
	}
	throw new Error('is not FileSystemEntry or FileSystemDirectoryEntry');
}

export function flat(tree: TreeNode): Array<TreeNode> {
	const result: Array<TreeNode> = [];
	if (isFileSystemFileEntry(tree)) {
		result.push(tree);
	} else {
		result.push(tree);
		forEach(tree.children, (child) => {
			const temp = flat(child);
			result.push(...temp);
		});
	}
	return result;
}

export function uploadToTargetModule(args: {
	nodeId: string;
	targetModule: TargetModule;
	destinationId?: string;
}): Promise<{ attachmentId: string }> {
	const { nodeId, targetModule, destinationId } = args;

	return new Promise<{ attachmentId: string }>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const url = `${REST_ENDPOINT}${UPLOAD_TO_PATH}`;
		xhr.open('POST', url, true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		const body = {
			nodeId,
			targetModule,
			// JSON.stringify remove destinationId if value is undefined
			destinationId
		};

		xhr.addEventListener('load', () => {
			if (xhr.readyState === (XMLHttpRequest.DONE || 4)) {
				uploadToCompleted(xhr, resolve, reject);
			}
		});
		xhr.addEventListener('error', () => uploadToCompleted(xhr, resolve, reject));
		xhr.addEventListener('abort', () => uploadToCompleted(xhr, resolve, reject));
		xhr.send(JSON.stringify(body));
	});
}

/**
 * Check if a file is supported by preview by its mime type
 *
 * [0]: tells whether the given mime type is supported or not
 *
 * [1]: if mime type is supported, tells which type of preview this mime type is associated to
 */
export function isSupportedByPreview(
	mimeType: string | undefined,
	type: 'thumbnail' | 'preview' = 'preview'
): [boolean, typeof PREVIEW_TYPE[keyof typeof PREVIEW_TYPE] | undefined] {
	return [
		!!mimeType &&
			((mimeType.startsWith('image') && mimeType !== 'image/svg+xml') ||
				mimeType.includes('pdf') ||
				(type === 'preview' && previewHandledMimeTypes.includes(mimeType)) ||
				(type === 'thumbnail' && thumbnailHandledMimeTypes.includes(mimeType))),
		(mimeType &&
			((mimeType.startsWith('image') && PREVIEW_TYPE.IMAGE) ||
				(mimeType.includes('pdf') && PREVIEW_TYPE.PDF) ||
				PREVIEW_TYPE.DOCUMENT)) ||
			undefined
	];
}

/**
 * Get preview src
 */
export const getImgPreviewSrc = (
	id: string,
	version: number,
	weight: number,
	height: number,
	quality: 'lowest' | 'low' | 'medium' | 'high' | 'highest' // medium as default if not set
): string =>
	`${REST_ENDPOINT}${PREVIEW_PATH}/${PREVIEW_TYPE.IMAGE}/${id}/${version}/${weight}x${height}?quality=${quality}`;

export const getPdfPreviewSrc = (id: string, version?: number): string =>
	`${REST_ENDPOINT}${PREVIEW_PATH}/${PREVIEW_TYPE.PDF}/${id}/${version}`;

export const getDocumentPreviewSrc = (id: string, version?: number): string =>
	`${REST_ENDPOINT}${PREVIEW_PATH}/${PREVIEW_TYPE.DOCUMENT}/${id}/${version}`;

/**
 * Get thumbnail src
 */
export const getPreviewThumbnailSrc = (
	id: string,
	version: number | undefined,
	type: NodeType,
	mimeType: string | undefined,
	width: number,
	height: number,
	shape?: 'rectangular' | 'rounded',
	quality?: 'lowest' | 'low' | 'medium' | 'high' | 'highest',
	outputFormat?: 'jpeg' | 'png'
): string | undefined => {
	if (version && mimeType) {
		const optionalParams = [];
		shape && optionalParams.push(`shape=${shape}`);
		quality && optionalParams.push(`quality=${quality}`);
		outputFormat && optionalParams.push(`output_format=${outputFormat}`);
		const optionalParamsStr = (optionalParams.length > 0 && `?${optionalParams.join('&')}`) || '';
		if (mimeType.startsWith('image') && mimeType !== 'image/svg+xml') {
			return `${REST_ENDPOINT}${PREVIEW_PATH}/${PREVIEW_TYPE.IMAGE}/${id}/${version}/${width}x${height}/thumbnail/${optionalParamsStr}`;
		}
		if (includes(mimeType, 'pdf')) {
			return `${REST_ENDPOINT}${PREVIEW_PATH}/${PREVIEW_TYPE.PDF}/${id}/${version}/${width}x${height}/thumbnail/${optionalParamsStr}`;
		}
		if (includes(thumbnailHandledMimeTypes, mimeType)) {
			return `${REST_ENDPOINT}${PREVIEW_PATH}/${PREVIEW_TYPE.DOCUMENT}/${id}/${version}/${width}x${height}/thumbnail/${optionalParamsStr}`;
		}
	}
	return undefined;
};

export const getListItemAvatarPictureUrl = (
	id: string,
	version: number | undefined,
	type: NodeType,
	mimeType: string | undefined
): string | undefined => getPreviewThumbnailSrc(id, version, type, mimeType, 80, 80);

export function getNewDocumentActionLabel(t: TFunction, docsType: DocsType): string {
	const [format] = docsType.split('_');
	return t(`create.options.new.${format.toLowerCase()}Document`, 'Microsoft {{ext}}', {
		context: DOCS_EXTENSIONS[docsType],
		replace: {
			ext: `(.${DOCS_EXTENSIONS[docsType]})`
		}
	});
}

type CalcOperator = '+' | '-' | '*' | '/';
type OperationTuple = [operator: CalcOperator, secondValue: string | number];
export function cssCalcBuilder(
	firstValue: string | number,
	...operations: OperationTuple[]
): `calc(${string})` | string {
	if (operations.length === 0) {
		return `${firstValue}`;
	}
	const operationsString = reduce(
		operations,
		(accumulator, [operator, secondValue]) => {
			if (
				operator !== undefined &&
				operator !== null &&
				operator.length > 0 &&
				secondValue !== undefined &&
				secondValue !== null &&
				`${secondValue}`.length > 0
			) {
				return `${accumulator} ${operator} ${secondValue}`;
			}
			return accumulator;
		},
		`${firstValue}`
	);

	return `calc(${operationsString})`;
}

export function isFile(node: { __typename?: string } & Record<string, unknown>): node is File {
	return node.__typename === 'File';
}

export function isFolder(node: { __typename?: string } & Record<string, unknown>): node is Folder {
	return node.__typename === 'Folder';
}
