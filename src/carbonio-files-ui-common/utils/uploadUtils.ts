/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
// KNOWN ISSUE: Since that folders are actually files, this is the only way to distinguish them from another kind of file.
// Although this method doesn't give you absolute certainty that a file is a folder:
// it might be a file without extension and with a size of 0 or exactly N x 4096B.
// https://stackoverflow.com/a/25095250/17280436
import { ApolloClient, ApolloQueryResult, NormalizedCacheObject } from '@apollo/client';
import { forEach, map, find, filter, reduce, pull } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import { UploadFunctions, uploadFunctionsVar, UploadRecord, uploadVar } from '../apollo/uploadVar';
import { REST_ENDPOINT, UPLOAD_PATH, UPLOAD_VERSION_PATH } from '../constants';
import GET_CHILD from '../graphql/queries/getChild.graphql';
import GET_CHILDREN from '../graphql/queries/getChildren.graphql';
import GET_VERSIONS from '../graphql/queries/getVersions.graphql';
import { UpdateFolderContentType } from '../hooks/graphql/useUpdateFolderContent';
import { UploadFolderItem } from '../types/common';
import { UploadItem, UploadStatus } from '../types/graphql/client-types';
import {
	GetChildQuery,
	GetChildQueryVariables,
	GetChildrenQuery,
	GetChildrenQueryVariables,
	GetVersionsQuery,
	GetVersionsQueryVariables,
	NodeSort,
	NodeType
} from '../types/graphql/types';
import { encodeBase64, isFileSystemDirectoryEntry, isFolder, TreeNode } from './utils';

export type UploadAddType = { file: File; fileSystemEntry?: FileSystemEntry | null };

export function isUploadFolderItem(item: Partial<UploadItem>): item is UploadFolderItem {
	return item !== undefined && 'children' in item;
}

export function missingFolderElementsCount(id: string): number {
	const uploadFolderItem = uploadVar()[id];
	if (isUploadFolderItem(uploadFolderItem)) {
		return uploadFolderItem.contentCount - uploadFolderItem.progress - uploadFolderItem.failedCount;
	}
	throw new Error('Unable to find contentCount on uploadItem');
}

export function isTheLastElement(id: string): boolean {
	return missingFolderElementsCount(id) === 1;
}

export function thereAreFailedElements(id: string): boolean {
	const uploadFolderItem = uploadVar()[id];
	if (isUploadFolderItem(uploadFolderItem)) {
		return uploadFolderItem.failedCount > 0;
	}
	throw new Error('Unable to find failedCount on uploadItem');
}

type UploadActionUpdateValueType = { id: string } & (
	| Partial<UploadItem>
	| Partial<UploadFolderItem>
);

type UploadAction =
	| { type: 'add'; value: UploadRecord }
	| { type: 'remove'; value: string[] }
	| { type: 'update'; value: UploadActionUpdateValueType | Array<UploadActionUpdateValueType> };

export function uploadVarReducer(action: UploadAction): UploadRecord {
	switch (action.type) {
		case 'add':
			uploadVar({ ...uploadVar(), ...action.value });
			return uploadVar();
		case 'update':
			if (action.value instanceof Array) {
				// TODO
				return uploadVar();
			}
			if (uploadVar()[action.value.id]) {
				uploadVar({
					...uploadVar(),
					[action.value.id]: { ...uploadVar()[action.value.id], ...action.value }
				});
			}
			return uploadVar();

		case 'remove':
			uploadVar(
				reduce<UploadRecord, UploadRecord>(
					uploadVar(),
					(result, item, key) => {
						if (!action.value.includes(item.id)) {
							result[key] = item;
						}
						return result;
					},
					{}
				)
			);
			return uploadVar();
		default:
			return uploadVar();
	}
}

export function getFolderStatus(
	failedCount: number,
	progress: number,
	contentCount: number
): UploadStatus {
	return (
		(failedCount + progress < contentCount && UploadStatus.LOADING) ||
		(failedCount > 0 && UploadStatus.FAILED) ||
		UploadStatus.COMPLETED
	);
}

export function incrementAllParentsFailedCount(uploadItem: UploadItem): void {
	if (uploadItem.parentId) {
		const parent = uploadVar()[uploadItem.parentId];
		if (parent && isUploadFolderItem(parent) && parent.children.includes(uploadItem.id)) {
			const status = getFolderStatus(parent.failedCount + 1, parent.progress, parent.contentCount);
			uploadVarReducer({
				type: 'update',
				value: {
					status,
					id: parent.id,
					failedCount: parent.failedCount + 1
				}
			});
			incrementAllParentsFailedCount(parent);
		}
	}
}

export function decrementAllParentsFailedCountByAmount(
	uploadItem: UploadItem,
	amount: number,
	mustUpdateParentsStatus = true
): void {
	if (uploadItem.parentId) {
		const parent = uploadVar()[uploadItem.parentId];
		if (parent && isUploadFolderItem(parent) && parent.children.includes(uploadItem.id)) {
			const newStatus: Pick<UploadFolderItem, 'id'> & Partial<UploadFolderItem> = {
				id: parent.id,
				failedCount: parent.failedCount - amount
			};
			if (mustUpdateParentsStatus) {
				newStatus.status = getFolderStatus(
					parent.failedCount - amount,
					parent.progress,
					parent.contentCount
				);
			}

			uploadVarReducer({
				type: 'update',
				value: newStatus
			});
			decrementAllParentsFailedCountByAmount(parent, amount, mustUpdateParentsStatus);
		}
	}
}

export function decrementAllParentsCompletedByAmount(uploadItem: UploadItem, amount: number): void {
	if (uploadItem.parentId) {
		const parent = uploadVar()[uploadItem.parentId];
		if (parent && isUploadFolderItem(parent)) {
			const status = getFolderStatus(
				parent.failedCount,
				parent.progress - amount,
				parent.contentCount
			);
			uploadVarReducer({
				type: 'update',
				value: {
					status,
					id: parent.id,
					progress: parent.progress - amount
				}
			});
			decrementAllParentsCompletedByAmount(parent, amount);
		}
	}
}

export function incrementAllParents(uploadItem: UploadItem): void {
	if (uploadItem.parentId) {
		const parent = uploadVar()[uploadItem.parentId];
		// abort callback sometimes does not stop the upload properly, but the item is removed from the parent
		// so check that the item is still a child of the parent
		if (parent && isUploadFolderItem(parent) && parent.children.includes(uploadItem.id)) {
			const status = getFolderStatus(parent.failedCount, parent.progress + 1, parent.contentCount);
			uploadVarReducer({
				type: 'update',
				value: {
					status,
					id: parent.id,
					progress: parent.progress + 1
				}
			});
			incrementAllParents(parent);
		}
	}
}

export function decrementAllParentsDenominatorByAmount(
	uploadItem: UploadItem,
	amount: number
): void {
	if (uploadItem.parentId) {
		const parent = uploadVar()[uploadItem.parentId];
		if (parent && isUploadFolderItem(parent)) {
			const status = getFolderStatus(
				parent.failedCount,
				parent.progress,
				parent.contentCount - amount
			);
			uploadVarReducer({
				type: 'update',
				value: {
					id: parent.id,
					contentCount: parent.contentCount - amount,
					status
				}
			});
			decrementAllParentsDenominatorByAmount(parent, amount);
		}
	}
}

export function removeFromParentChildren(uploadItem: UploadItem): void {
	if (uploadItem.parentId) {
		const parent = uploadVar()[uploadItem.parentId];
		if (parent && isUploadFolderItem(parent)) {
			const updatedParent: Partial<UploadFolderItem> & Pick<UploadFolderItem, 'id'> = {
				id: parent.id,
				children: filter(parent.children, (childId) => childId !== uploadItem.id)
			};
			uploadVarReducer({
				type: 'update',
				value: updatedParent
			});
		}
	}
}

export function addVersionToCache(
	apolloClient: ApolloClient<NormalizedCacheObject>,
	nodeId: string
): Promise<ApolloQueryResult<GetVersionsQuery>> {
	return apolloClient.query<GetVersionsQuery, GetVersionsQueryVariables>({
		query: GET_VERSIONS,
		fetchPolicy: 'network-only',
		variables: {
			node_id: nodeId
		}
	});
}

export function updateProgress(ev: ProgressEvent, fileEnriched: UploadItem): void {
	if (ev.lengthComputable) {
		const updatedValue = {
			id: fileEnriched.id,
			progress: Math.floor((ev.loaded / ev.total) * 100)
		};

		uploadVarReducer({ type: 'update', value: updatedValue });
	}
}

// do not update counter here because a retry could not be a retry but the first tentative
export function singleRetry(id: string): void {
	const retryFile = uploadVar()[id];
	if (retryFile == null) {
		throw new Error('unable to retry missing file');
	}
	if (retryFile.status !== UploadStatus.FAILED && retryFile.status !== UploadStatus.QUEUED) {
		throw new Error('unable to retry, upload must be Failed or Queued');
	}

	const newRetryFile = uploadVar()[id];
	if (newRetryFile) {
		const itemFunctions = uploadFunctionsVar()[newRetryFile.id];
		const abortFunction = itemFunctions.retry(newRetryFile);
		uploadFunctionsVar({
			...uploadFunctionsVar(),
			[newRetryFile.id]: { ...itemFunctions, abort: abortFunction }
		});
	}
}

function loadItemAsChild(
	nodeId: string,
	parentId: string,
	apolloClient: ApolloClient<NormalizedCacheObject>,
	nodeSort: NodeSort,
	addNodeToFolder: UpdateFolderContentType['addNodeToFolder']
): Promise<void> {
	const parentFolder = apolloClient.cache.readQuery<GetChildrenQuery, GetChildrenQueryVariables>({
		query: GET_CHILDREN,
		variables: {
			node_id: parentId,
			// load all cached children
			children_limit: Number.MAX_SAFE_INTEGER,
			sort: nodeSort
		}
	});
	if (parentFolder?.getNode && isFolder(parentFolder.getNode)) {
		const parentNode = parentFolder.getNode;
		return apolloClient
			.query<GetChildQuery, GetChildQueryVariables>({
				query: GET_CHILD,
				fetchPolicy: 'no-cache',
				variables: {
					node_id: nodeId as string
				}
			})
			.then((result) => {
				if (result?.data?.getNode) {
					addNodeToFolder(parentNode, result.data.getNode);
				}
			})
			.catch((err) => {
				console.error(err);
			});
	}
	return Promise.resolve();
}

export function canBeProcessed(id: string): boolean {
	return uploadVar()[id].parentNodeId !== null;
}

/**
 * UploadQueue Singleton
 */
export const UploadQueue = ((): {
	LIMIT: number;
	start: (id: string) => void;
	startAll: () => void;
	add: (...ids: string[]) => void;
	removeAndStartNext: (...ids: string[]) => string[];
} => {
	const LIMIT = 3;

	const waitingList: string[] = [];

	const loadingList: string[] = [];

	function getFirstReadyWaitingItemId(): string | undefined {
		return find(waitingList, (id) => canBeProcessed(id));
	}

	function canLoadMore(): boolean {
		return loadingList.length < LIMIT && waitingList.length > 0;
	}

	function start(id: string): void {
		pull(waitingList, id);
		loadingList.push(id);
		singleRetry(id);
	}

	function startAll(): void {
		while (canLoadMore() && getFirstReadyWaitingItemId()) {
			const itemId = getFirstReadyWaitingItemId();
			if (itemId) {
				start(itemId);
			}
		}
	}

	function add(...ids: string[]): void {
		waitingList.push(...ids);
	}

	function removeAndStartNext(...ids: string[]): string[] {
		const loadingIds = pull(loadingList, ...ids);
		const waitingIds = pull(waitingList, ...ids);
		startAll();
		return [...loadingIds, ...waitingIds];
	}

	return {
		LIMIT,
		start,
		startAll,
		add,
		removeAndStartNext
	};
})();

export function uploadCompleted(
	xhr: XMLHttpRequest,
	fileEnriched: UploadItem,
	apolloClient: ApolloClient<NormalizedCacheObject>,
	nodeSort: NodeSort,
	addNodeToFolder: UpdateFolderContentType['addNodeToFolder'],
	isUploadVersion: boolean
): void {
	if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
		const response = JSON.parse(xhr.response);
		const { nodeId } = response;
		if (isUploadVersion) {
			addVersionToCache(apolloClient, nodeId);
		}

		uploadVarReducer({
			type: 'update',
			value: { id: fileEnriched.id, status: UploadStatus.COMPLETED, progress: 100, nodeId }
		});

		incrementAllParents(fileEnriched);

		if (fileEnriched.parentNodeId) {
			loadItemAsChild(nodeId, fileEnriched.parentNodeId, apolloClient, nodeSort, addNodeToFolder);
		}
	} else {
		/*
		 * Handled Statuses
		 * 405: upload-version error should happen only when number of versions is
		 * 			strictly greater than max number of version config value (config changed)
		 * 413:
		 * 500: name already exists
		 * 0: aborted (also blocked request)
		 */

		uploadVarReducer({
			type: 'update',
			value: { id: fileEnriched.id, status: UploadStatus.FAILED }
		});
		incrementAllParentsFailedCount(fileEnriched);

		const handledStatuses = [405, 413, 500, 0];
		if (xhr.readyState !== XMLHttpRequest.UNSENT && !handledStatuses.includes(xhr.status)) {
			console.error('upload error: unhandled status', xhr.status, fileEnriched);
		}
	}

	UploadQueue.removeAndStartNext(fileEnriched.id);
}

export function upload(
	fileEnriched: UploadItem,
	apolloClient: ApolloClient<NormalizedCacheObject>,
	nodeSort: NodeSort,
	addNodeToFolder: UpdateFolderContentType['addNodeToFolder']
): UploadFunctions['abort'] {
	if (fileEnriched.file === null || fileEnriched.parentNodeId === null) {
		throw new Error('cannot upload without a file or a parentNodeId');
	}

	uploadVarReducer({
		type: 'update',
		value: {
			id: fileEnriched.id,
			status: UploadStatus.LOADING,
			progress: 0
		}
	});

	const xhr = new XMLHttpRequest();
	const url = `${REST_ENDPOINT}${UPLOAD_PATH}`;
	xhr.open('POST', url, true);

	xhr.setRequestHeader('Filename', encodeBase64(fileEnriched.file.name));
	xhr.setRequestHeader('ParentId', fileEnriched.parentNodeId);

	// FIXME: fix in order to be able to test the upload with msw
	//   see https://github.com/mswjs/interceptors/issues/187
	if (xhr.upload?.addEventListener) {
		xhr.upload.addEventListener('progress', (ev: ProgressEvent) =>
			updateProgress(ev, fileEnriched)
		);
	}

	const uploadCompletedListener = (): void =>
		uploadCompleted(xhr, fileEnriched, apolloClient, nodeSort, addNodeToFolder, false);

	xhr.addEventListener('load', uploadCompletedListener);
	xhr.addEventListener('error', uploadCompletedListener);
	xhr.addEventListener('abort', uploadCompletedListener);
	const loadStart = new Promise<XMLHttpRequest>((resolve) => {
		xhr.addEventListener('loadstart', () => resolve(xhr));
	});

	xhr.send(fileEnriched.file);

	return (): void => {
		loadStart.then((xhrResult) => {
			xhrResult.abort();
			xhrResult.removeEventListener('load', uploadCompletedListener);
			xhrResult.removeEventListener('error', uploadCompletedListener);
			xhrResult.removeEventListener('abort', uploadCompletedListener);

			decrementAllParentsFailedCountByAmount(fileEnriched, 1);
		});
	};
}

export function uploadVersion(
	fileEnriched: UploadItem,
	apolloClient: ApolloClient<NormalizedCacheObject>,
	nodeSort: NodeSort,
	addNodeToFolder: UpdateFolderContentType['addNodeToFolder'],
	overwriteVersion = false
): UploadFunctions['abort'] {
	if (fileEnriched.nodeId === null || fileEnriched.file === null) {
		throw new Error('cannot upload a version without file or nodeId');
	}
	const xhr = new XMLHttpRequest();
	const url = `${REST_ENDPOINT}${UPLOAD_VERSION_PATH}`;
	xhr.open('POST', url, true);

	xhr.setRequestHeader('NodeId', fileEnriched.nodeId);
	xhr.setRequestHeader('Filename', encodeBase64(fileEnriched.file.name));
	xhr.setRequestHeader('OverwriteVersion', `${overwriteVersion}`);

	// FIXME: fix in order to be able to test the upload with msw
	//   see https://github.com/mswjs/interceptors/issues/187
	if (xhr.upload?.addEventListener) {
		xhr.upload.addEventListener('progress', (ev: ProgressEvent) =>
			updateProgress(ev, fileEnriched)
		);
	}
	xhr.addEventListener('load', () =>
		uploadCompleted(xhr, fileEnriched, apolloClient, nodeSort, addNodeToFolder, true)
	);
	xhr.addEventListener('error', () =>
		uploadCompleted(xhr, fileEnriched, apolloClient, nodeSort, addNodeToFolder, true)
	);
	xhr.addEventListener('abort', () =>
		uploadCompleted(xhr, fileEnriched, apolloClient, nodeSort, addNodeToFolder, true)
	);
	xhr.send(fileEnriched.file);

	return (): void => {
		xhr.abort();
	};
}

export function getUploadAddType(dataTransfer: DataTransfer): UploadAddType[] {
	const fileEntries: UploadAddType[] = [];
	forEach(dataTransfer.items, (droppedItem, index) => {
		const item: FileSystemEntry | null =
			(droppedItem.webkitGetAsEntry && droppedItem.webkitGetAsEntry()) ||
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			(droppedItem.getAsEntry && droppedItem.getAsEntry()) ||
			null;
		if (item?.name !== dataTransfer.files[index].name) {
			console.error('dataTransfer items and files mismatch');
		}
		fileEntries.push({ fileSystemEntry: item, file: dataTransfer.files[index] });
	});
	return fileEntries;
}

export function getUploadAddTypeFromInput(fileList: FileList): UploadAddType[] {
	return map(fileList, (file) => ({ file }));
}

export function getUploadNodeType(item: Partial<UploadItem>): NodeType {
	return isUploadFolderItem(item) ? NodeType.Folder : NodeType.Other;
}

export function flatUploadItemChildren(
	uploadItem: UploadItem,
	uploadStatusMap: { [id: string]: UploadItem }
): Array<UploadItem> {
	const result: Array<UploadItem> = [];
	if (isUploadFolderItem(uploadItem)) {
		result.push(uploadItem);
		forEach(uploadItem.children, (childId) => {
			const temp = flatUploadItemChildren(uploadStatusMap[childId], uploadStatusMap);
			result.push(...temp);
		});
	} else {
		result.push(uploadItem);
	}
	return result;
}

export function flatUploadItemChildrenIds(uploadItemId: string): Array<string> {
	const result: Array<string> = [];
	const item = uploadVar()[uploadItemId];
	if (isUploadFolderItem(item)) {
		result.push(uploadItemId);
		forEach(item.children, (childId) => {
			const temp = flatUploadItemChildrenIds(childId);
			result.push(...temp);
		});
	} else {
		result.push(uploadItemId);
	}
	return result;
}

export function getFileSystemFileEntryFile(fileSystemEntry: FileSystemFileEntry): Promise<File> {
	return new Promise((resolve, reject) => {
		fileSystemEntry.file((file) => {
			resolve(file);
		}, reject);
	});
}

export async function deepMapTreeNodes(
	treeNodes: TreeNode[] | undefined,
	parentId: string
): Promise<{ directChildrenIds: string[]; flatChildrenList: Array<UploadItem> }> {
	const childrenIds: string[] = [];
	const flatChildren: Array<UploadItem> = [];
	for (let i = 0; treeNodes && i < treeNodes.length; i += 1) {
		const treeNode = treeNodes[i];
		const fileEnriched: UploadItem = {
			file: null,
			parentId,
			progress: 0,
			status: UploadStatus.QUEUED,
			id: `upload-${uuidv4()}`,
			nodeId: null,
			parentNodeId: null,
			fullPath: treeNode.fullPath,
			name: treeNode.name
		};
		childrenIds.push(fileEnriched.id);
		if (isFileSystemDirectoryEntry(treeNode)) {
			const folderEnriched: UploadFolderItem = {
				...fileEnriched,
				children: [],
				contentCount: 0,
				failedCount: 0
			};
			// eslint-disable-next-line no-await-in-loop
			const { directChildrenIds, flatChildrenList } = await deepMapTreeNodes(
				treeNode.children,
				fileEnriched.id
			);
			folderEnriched.children = directChildrenIds;
			// consider also the folder itself in the count
			folderEnriched.contentCount = flatChildrenList.length + 1;
			flatChildren.push(folderEnriched, ...flatChildrenList);
		} else {
			// eslint-disable-next-line no-await-in-loop
			fileEnriched.file = await getFileSystemFileEntryFile(treeNode);
			flatChildren.push(fileEnriched);
		}
	}
	return { directChildrenIds: childrenIds, flatChildrenList: flatChildren };
}
