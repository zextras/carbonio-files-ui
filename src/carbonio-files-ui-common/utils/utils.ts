/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { ApolloError } from '@apollo/client';
import type { Location } from 'history';
import { TFunction } from 'i18next';
import {
	chain,
	debounce,
	findIndex,
	first,
	forEach,
	isEmpty,
	map,
	reduce,
	size,
	toLower,
	trim
} from 'lodash';
import { DefaultTheme } from 'styled-components';

import {
	DATE_FORMAT,
	DOCS_ENDPOINT,
	DOCS_EXTENSIONS,
	DOWNLOAD_PATH,
	INTERNAL_PATH,
	OPEN_FILE_PATH,
	REST_ENDPOINT,
	ROOTS,
	UPLOAD_TO_PATH
} from '../constants';
import {
	Contact,
	Crumb,
	CrumbNode,
	DocsType,
	NodeListItemType,
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
import { MakeRequiredNonNull } from '../types/utils';
import type { NodeListItemUIProps } from '../views/components/NodeListItemUI';

/**
 * Format a size in byte as human-readable
 */
export const humanFileSize = (inputSize: number): string => {
	if (inputSize === 0) {
		return '0 B';
	}
	const i = Math.floor(Math.log(inputSize) / Math.log(1024));
	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	if (i >= units.length) {
		throw new Error('Unsupported inputSize');
	}
	return `${(inputSize / 1024 ** i).toFixed(2).toString()} ${units[i]}`;
};

function getIconByRootId(rootId: Maybe<string> | undefined): keyof DefaultTheme['icons'] {
	switch (rootId) {
		case ROOTS.LOCAL_ROOT:
			return 'Folder';
		case ROOTS.TRASH:
			return 'Trash2';
		case ROOTS.SHARED_WITH_ME:
			return 'ArrowCircleLeft';
		default:
			return 'File';
	}
}
/**
 * Given a file type returns the DS icon name
 */
export const getIconByFileType = (
	type: NodeType,
	subType?: Maybe<string>,
	options?: { outline?: boolean }
): keyof DefaultTheme['icons'] => {
	function getIcon(): keyof DefaultTheme['icons'] {
		switch (type) {
			case NodeType.Folder:
				return 'Folder';
			case NodeType.Text:
				return subType === 'application/pdf' ? 'FilePdf' : 'FileText';
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
				return getIconByRootId(subType);
			}
			default:
				return 'File';
		}
	}
	const icon = getIcon();
	return options?.outline ? `${icon}Outline` : icon;
};

export const getIconColorByFileType = (
	type: NodeType,
	subType: Maybe<string> | undefined,
	theme: DefaultTheme
): string => {
	switch (type) {
		case NodeType.Folder:
			return theme.palette.secondary.regular;
		case NodeType.Text:
			return subType === 'application/pdf'
				? theme.palette.error.regular
				: theme.palette.primary.regular;
		case NodeType.Video:
			return theme.palette.error.regular;
		case NodeType.Audio:
			return theme.palette.gray0.regular;
		case NodeType.Image:
			return theme.palette.error.regular;
		case NodeType.Message:
			return theme.palette.primary.regular;
		case NodeType.Presentation:
			return theme.avatarColors.avatar_47;
		case NodeType.Spreadsheet:
			return theme.palette.success.regular;
		case NodeType.Application:
			return theme.palette.gray0.regular;
		case NodeType.Root:
			return subType === ROOTS.SHARED_WITH_ME
				? theme.palette.linked.regular
				: theme.palette.gray1.regular;
		default:
			return theme.palette.primary.regular;
	}
};

/**
 * Build the crumbs for a node formatted as required by @zextras/carbonio-design-system Breadcrumb.
 * @param nodes - each node should contain properties id, name and parent (optional, not considered if nodes is an array)
 * @param clickHandler - callback that handles the click on the breadcrumb item. It receives the node id as a param
 * @param t - translation function
 * @param nodeClickCondition - validation click function
 */
export const buildCrumbs = (
	nodes: Array<Maybe<CrumbNode> | undefined>,
	clickHandler?: (id: string, event: React.SyntheticEvent | KeyboardEvent) => void,
	t?: TFunction,
	nodeClickCondition: (node: Pick<Node, 'id' | 'name' | 'type'>) => boolean = (): boolean => true
): Crumb[] =>
	// the array can contain null if path is requested for a node with no accessible parent
	chain(nodes)
		.filter((node): node is CrumbNode => node !== undefined && node !== null)
		.map(
			(node): Crumb => ({
				id: node.id,
				/* i18next-extract-disable-next-line */
				label: t?.('node.alias.name', node.name, { context: node.id }) ?? node.name,
				onClick:
					node && clickHandler && nodeClickCondition(node)
						? (event: React.SyntheticEvent | KeyboardEvent): void => clickHandler(node.id, event)
						: undefined
			})
		)
		.value();

export const formatDate = (
	date: Date | string | number | undefined | null,
	locale?: string,
	format: Intl.DateTimeFormatOptions = DATE_FORMAT
): string => {
	if (date === null || date === undefined || (typeof date === 'string' && date.trim() === '')) {
		return '';
	}
	const fixedLocale = locale?.replaceAll('_', '-');
	try {
		return Intl.DateTimeFormat(fixedLocale, format).format(new Date(date));
	} catch (e) {
		if (e instanceof RangeError) {
			// try to format with only the language part of the locale
			// if there is no hyphen, use the system language by passing locale undefined
			const hyphenIndex = locale?.indexOf('-') ?? -1;
			return formatDate(
				date,
				hyphenIndex > -1 ? locale?.substring(0, hyphenIndex) : undefined,
				format
			);
		}
		throw e;
	}
};

export const initExpirationDate = (date: Date | null | undefined): Date | undefined => {
	if (date === undefined || date === null) {
		return undefined;
	}
	const endOfDay = new Date(date);
	endOfDay.setHours(23, 59, 59);
	return endOfDay;
};

export function takeIfNotEmpty(value: string | undefined): string | undefined {
	return value !== undefined && !isEmpty(value) ? value : undefined;
}

/**
 * Decode an Apollo Error in a string message
 */
export const decodeError = (error: ApolloError, t: TFunction): string | null => {
	if (!error) {
		return null;
	}
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
		const netError =
			typeof error.networkError.result === 'string'
				? error.networkError.result
				: map(error.networkError.result, (err) => err.extensions?.code || err.message).join('\n');
		errorMsg = errorMsg ? errorMsg + netError : netError;
	}
	return takeIfNotEmpty(errorMsg) ?? error.message;
};

export const getChipLabel = (contact: Contact | null | undefined): string => {
	if (!contact) {
		return '';
	}
	if (contact.firstName || contact.middleName || contact.lastName) {
		return trim(`${contact.firstName ?? ''} ${contact.middleName ?? ''} ${contact.lastName ?? ''}`);
	}
	return (
		takeIfNotEmpty(contact.full_name) ??
		takeIfNotEmpty(contact.fullName) ??
		takeIfNotEmpty(contact.email) ??
		takeIfNotEmpty(contact.name) ??
		''
	);
};

export const getChipTooltip = (contact: Contact | null | undefined): string => {
	if (!contact) {
		return '';
	}
	return contact.email ?? '';
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
			success ? resolve() : reject(new Error('copy command does not succeeded'));
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
	nodeA: Maybe<SortableNode> | undefined,
	nodeB: Maybe<SortableNode> | undefined,
	property: keyof SortableNode,
	{
		defaultIfNull,
		propertyModifier
	}: {
		defaultIfNull?: T;
		propertyModifier?: (p: NonNullable<T>) => NonNullable<T>;
	} = {}
): number {
	let propA = (nodeA?.[property] == null ? defaultIfNull : (nodeA[property] as T)) ?? null;
	let propB = (nodeB?.[property] == null ? defaultIfNull : (nodeB[property] as T)) ?? null;
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
	throw new Error(`invalid order ${orderType} ${order}`);
}

export function getInverseOrder(order: OrderTrend): OrderTrend {
	if (order === OrderTrend.Ascending) {
		return OrderTrend.Descending;
	}
	return OrderTrend.Ascending;
}

export function hexToRGBA(hexColor: string, alpha = 1): string {
	let r;
	let g;
	let b;

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

export function getNewDocumentActionLabel(t: TFunction, docsType: DocsType): string {
	const [format] = docsType.split('_');
	/* i18next-extract-disable-next-line */
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
): string {
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

export function isFile(
	node: ({ __typename?: string } & Record<string, unknown>) | null | undefined
): node is File & MakeRequiredNonNull<File, '__typename'> {
	return node?.__typename === 'File';
}

export function isFolder(
	node: ({ __typename?: string } & Record<string, unknown>) | null | undefined
): node is Folder & MakeRequiredNonNull<Folder, '__typename'> {
	return node?.__typename === 'Folder';
}

export async function asyncForEach<T>(
	items: T[],
	callback: (item: T) => Promise<void>
): Promise<void> {
	await items.reduce(async (previous, item) => {
		// Wait for the previous item to finish processing
		await previous;
		// Process this item
		await callback(item);
	}, Promise.resolve());
}

export function getDocumentGenericType(
	specificType: DocsType
): 'document' | 'spreadsheet' | 'presentation' {
	switch (specificType) {
		case DocsType.LIBRE_DOCUMENT:
		case DocsType.MS_DOCUMENT:
			return 'document';
		case DocsType.LIBRE_SPREADSHEET:
		case DocsType.MS_SPREADSHEET:
			return 'spreadsheet';
		case DocsType.LIBRE_PRESENTATION:
		case DocsType.MS_PRESENTATION:
			return 'presentation';
		default:
			return 'document';
	}
}

export function nodeToNodeListItemUIProps(
	node: Pick<
		NodeListItemType,
		| 'id'
		| 'name'
		| 'flagged'
		| 'owner'
		| 'shares'
		| 'last_editor'
		| 'type'
		| 'rootId'
		| '__typename'
	> &
		(Pick<{ __typename: 'File' } & NodeListItemType, 'size' | 'extension'> | Record<never, never>),
	t: TFunction,
	me: string
): Pick<
	NodeListItemUIProps,
	| 'id'
	| 'name'
	| 'flagActive'
	| 'incomingShare'
	| 'outgoingShare'
	| 'extensionOrType'
	| 'displayName'
	| 'size'
	| 'trashed'
> {
	return {
		id: node.id,
		name: node.name,
		flagActive: node.flagged,
		incomingShare: me !== node.owner?.id,
		outgoingShare: me === node.owner?.id && node.shares && node.shares.length > 0,
		extensionOrType:
			(isFile(node) && node.extension) || t(`node.type.${node.type.toLowerCase()}`, node.type),
		displayName:
			(node.last_editor?.id !== node.owner?.id && node.last_editor?.full_name) ||
			(node.owner?.id !== me && node.owner?.full_name) ||
			'',
		size: (isFile(node) && node.size) || undefined,
		trashed: node.rootId === ROOTS.TRASH
	};
}
