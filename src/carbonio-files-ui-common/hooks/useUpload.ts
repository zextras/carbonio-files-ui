/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback, useMemo } from 'react';

import { forEach, map, filter, includes, reduce, noop, partition } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import buildClient from '../apollo';
import { nodeSortVar } from '../apollo/nodeSortVar';
import { UploadFunctions, uploadFunctionsVar, uploadVar } from '../apollo/uploadVar';
import { UploadFolderItem } from '../types/common';
import { UploadItem, UploadStatus } from '../types/graphql/client-types';
import { File as FilesFile } from '../types/graphql/types';
import { DeepPick } from '../types/utils';
import {
	decrementAllParentsCompletedByAmount,
	decrementAllParentsDenominatorByAmount,
	decrementAllParentsFailedCountByAmount,
	deepMapTreeNodes,
	flatUploadItemChildren,
	flatUploadItemChildrenIds,
	getFolderStatus,
	incrementAllParents,
	incrementAllParentsFailedCount,
	isUploadFolderItem,
	removeFromParentChildren,
	upload,
	UploadAddType,
	UploadQueue,
	uploadVarReducer,
	uploadVersion
} from '../utils/uploadUtils';
import { isFileSystemDirectoryEntry, isFolder, scan } from '../utils/utils';
import { useCreateFolderMutation } from './graphql/mutations/useCreateFolderMutation';
import { useUpdateFolderContent } from './graphql/useUpdateFolderContent';

type UploadVarObject = {
	filesEnriched: { [id: string]: UploadItem };
	uploadFunctions: { [id: string]: UploadFunctions };
};

export type UseUploadHook = () => {
	add: (files: Array<UploadAddType>, destinationId: string) => void;
	update: (
		node: Pick<FilesFile, '__typename' | 'id'> & DeepPick<FilesFile, 'parent', 'id'>,
		file: File,
		overwriteVersion?: boolean
	) => void;
	removeById: (ids: Array<string>) => void;
	removeByNodeId: (nodeIds: Array<string>) => void;
	removeAllCompleted: () => void;
	retryById: (ids: Array<string>) => void;
};

export const useUpload: UseUploadHook = () => {
	// TODO use useApolloClient when apollo provider will be moved up in tha app
	// const apolloClient = useApolloClient();
	const apolloClient = useMemo(() => buildClient(), []);

	const { addNodeToFolder } = useUpdateFolderContent(apolloClient);

	const { createFolder: createFolderMutation } = useCreateFolderMutation({
		showSnackbar: false,
		client: apolloClient
	});

	const createFolder = useCallback(
		(uploadFolderItem: UploadFolderItem) => {
			if (uploadFolderItem.nodeId !== null) {
				return Promise.resolve(uploadFolderItem.nodeId);
			}
			if (uploadFolderItem.parentNodeId) {
				return createFolderMutation(
					{ id: uploadFolderItem.parentNodeId },
					uploadFolderItem.name
				).then((createFolderResult) => {
					const folderNode = createFolderResult.data?.createFolder;
					if (folderNode && isFolder(folderNode)) {
						const status = getFolderStatus(
							uploadFolderItem.failedCount,
							uploadFolderItem.progress + 1,
							uploadFolderItem.contentCount
						);
						uploadVarReducer({
							type: 'update',
							value: {
								id: uploadFolderItem.id,
								nodeId: folderNode.id,
								status,
								progress: uploadFolderItem.progress + 1
							}
						});
						incrementAllParents(uploadFolderItem);
						return folderNode.id;
					}
					return null;
				});
			}
			return Promise.reject(new Error('cannot create folder item without parentNodeId'));
		},
		[createFolderMutation]
	);

	const uploadFolder = useCallback<(folder: UploadFolderItem) => UploadFunctions['abort']>(
		(uploadFolderItem) => {
			if (uploadFolderItem.parentNodeId) {
				const updatedFolder: UploadFolderItem = {
					...uploadFolderItem,
					status: UploadStatus.LOADING
				};
				uploadVarReducer({
					type: 'update',
					value: updatedFolder
				});

				createFolder(uploadFolderItem)
					.then((parentFolderNodeId) => {
						if (parentFolderNodeId) {
							forEach(uploadFolderItem.children, (child) => {
								const childUploadItem = uploadVar()[child];
								if (childUploadItem.nodeId === null) {
									uploadVarReducer({
										type: 'update',
										value: {
											id: child,
											parentNodeId: parentFolderNodeId,
											status: UploadStatus.QUEUED,
											progress: 0
										}
									});
								}
							});
						}
					})
					.catch(() => {
						const itemsToSetAsFailed = flatUploadItemChildren(uploadFolderItem, uploadVar());
						forEach(itemsToSetAsFailed, (item) => {
							if (item.status !== UploadStatus.COMPLETED) {
								if (isUploadFolderItem(item)) {
									uploadVarReducer({
										type: 'update',
										value: {
											id: item.id,
											status: UploadStatus.FAILED,
											failedCount: item.failedCount + 1
										}
									});
								} else {
									uploadVarReducer({
										type: 'update',
										value: {
											id: item.id,
											status: UploadStatus.FAILED
										}
									});
								}
								incrementAllParentsFailedCount(item);
							}
						});
					})
					.finally(() => {
						UploadQueue.removeAndStartNext(uploadFolderItem.id);
					});
			}
			return noop;
		},
		[createFolder]
	);

	const startUploadAndGetAbortFunction = useCallback(
		(fileToUpload: UploadItem): UploadFunctions['abort'] => {
			if (isUploadFolderItem(fileToUpload)) {
				return uploadFolder(fileToUpload);
			}
			if (fileToUpload.file !== null && fileToUpload.parentNodeId !== null) {
				return upload(fileToUpload, apolloClient, nodeSortVar(), addNodeToFolder);
			}
			return noop;
		},
		[addNodeToFolder, apolloClient, uploadFolder]
	);

	const prepareItem = useCallback<
		(
			itemToAdd: UploadAddType,
			destinationId: string
		) => { item: UploadItem; functions: UploadFunctions }
	>(
		(itemToAdd, destinationId) => {
			const fileEnriched: UploadItem = {
				file: itemToAdd.file,
				parentId: null,
				parentNodeId: destinationId,
				progress: 0,
				status: UploadStatus.QUEUED,
				id: `upload-${uuidv4()}`,
				nodeId: null,
				fullPath: itemToAdd.file.webkitRelativePath,
				name: itemToAdd.file.name
			};

			const retryFunction: UploadFunctions['retry'] = (newFile) =>
				startUploadAndGetAbortFunction(newFile);

			return {
				item: fileEnriched,
				functions: { abort: noop, retry: retryFunction }
			};
		},
		[startUploadAndGetAbortFunction]
	);

	const prepareFolderItem = useCallback<
		(
			fileEnriched: UploadItem,
			fileSystemEntry: FileSystemDirectoryEntry
		) => Promise<Array<{ item: UploadItem; functions: UploadFunctions }>>
	>(
		async (fileEnriched, fileSystemEntry) => {
			const treeRoot = await scan(fileSystemEntry);
			const uploadItemFlatList: UploadItem[] = [];
			if (isFileSystemDirectoryEntry(treeRoot)) {
				const folderEnriched: UploadFolderItem = {
					...fileEnriched,
					children: [],
					contentCount: 0,
					failedCount: 0
				};
				uploadItemFlatList.push(folderEnriched);
				const { flatChildrenList, directChildrenIds } = await deepMapTreeNodes(
					treeRoot.children,
					folderEnriched.id
				);
				folderEnriched.children = directChildrenIds;
				// consider also the folder itself in the count
				folderEnriched.contentCount = flatChildrenList.length + 1;
				uploadItemFlatList.push(...flatChildrenList);
			}
			return map(uploadItemFlatList, (uploadItem) => ({
				item: uploadItem,
				functions: {
					abort: noop,
					retry: (newFile) => startUploadAndGetAbortFunction(newFile)
				}
			}));
		},
		[startUploadAndGetAbortFunction]
	);

	const prepareReactiveVar = useCallback<
		(items: Array<UploadAddType>, destinationId: string) => Promise<UploadVarObject>
	>(
		async (items, destinationId) => {
			const accumulator: UploadVarObject = { filesEnriched: {}, uploadFunctions: {} };
			for (let i = 0; i < items.length; i += 1) {
				const item = items[i];
				const itemEnriched = prepareItem(item, destinationId);
				if (item.fileSystemEntry && isFileSystemDirectoryEntry(item.fileSystemEntry)) {
					// eslint-disable-next-line no-await-in-loop
					const folderWithChildren = await prepareFolderItem(
						itemEnriched.item,
						item.fileSystemEntry
					);
					for (let j = 0; j < folderWithChildren.length; j += 1) {
						const folderWithChildrenItem = folderWithChildren[j];
						UploadQueue.add(folderWithChildrenItem.item.id);
						accumulator.filesEnriched[folderWithChildrenItem.item.id] = folderWithChildrenItem.item;
						accumulator.uploadFunctions[folderWithChildrenItem.item.id] =
							folderWithChildrenItem.functions;
					}
				} else {
					UploadQueue.add(itemEnriched.item.id);
					accumulator.filesEnriched[itemEnriched.item.id] = itemEnriched.item;
					accumulator.uploadFunctions[itemEnriched.item.id] = itemEnriched.functions;
				}
			}
			return accumulator;
		},
		[prepareFolderItem, prepareItem]
	);

	const add = useCallback<ReturnType<UseUploadHook>['add']>(
		(itemsToAdd, destinationId) => {
			prepareReactiveVar(itemsToAdd, destinationId).then((uploadVarObject) => {
				uploadVarReducer({ type: 'add', value: uploadVarObject.filesEnriched });
				uploadFunctionsVar({ ...uploadFunctionsVar(), ...uploadVarObject.uploadFunctions });
				UploadQueue.startAll();
			});
		},
		[prepareReactiveVar]
	);

	const update = useCallback<ReturnType<UseUploadHook>['update']>(
		(node, file, overwriteVersion) => {
			const fileEnriched: UploadItem = {
				file,
				progress: 0,
				status: UploadStatus.LOADING,
				id: `upload-${uuidv4()}`,
				nodeId: node.id,
				parentNodeId: node.parent?.id || null,
				parentId: null,
				fullPath: node.parent?.name || '',
				name: file.name
			};
			uploadVarReducer({ type: 'add', value: { [fileEnriched.id]: fileEnriched } });

			function startUploadVersionAndGetAbortFunction(
				fileToUpload: UploadItem
			): UploadFunctions['abort'] {
				return uploadVersion(
					fileToUpload,
					apolloClient,
					nodeSortVar(),
					addNodeToFolder,
					overwriteVersion
				);
			}

			const abortFunction: UploadFunctions['abort'] =
				startUploadVersionAndGetAbortFunction(fileEnriched);
			const retryFunction: UploadFunctions['retry'] = (newFile) =>
				startUploadAndGetAbortFunction(newFile);
			uploadFunctionsVar({
				...uploadFunctionsVar(),
				[fileEnriched.id]: { abort: abortFunction, retry: retryFunction }
			});
		},
		[addNodeToFolder, apolloClient, startUploadAndGetAbortFunction]
	);

	const abort = useCallback((id: string) => {
		const uploadFunctions = { ...uploadFunctionsVar() };
		const abortFn = uploadFunctions[id].abort;
		abortFn();
		delete uploadFunctions[id];
		uploadFunctionsVar(uploadFunctions);
	}, []);

	const removeById = useCallback(
		(ids: Array<string>) => {
			const idsToRemove: Array<string> = [];
			forEach(ids, (id) => {
				const itemToRemove = uploadVar()[id];

				if (itemToRemove) {
					if (isUploadFolderItem(itemToRemove)) {
						const uploadItems = flatUploadItemChildren(itemToRemove, uploadVar());
						const fileLoadingUploadItems = filter(
							uploadItems,
							(uploadItem) =>
								!isUploadFolderItem(uploadItem) && uploadItem.status !== UploadStatus.COMPLETED
						);
						// abort if loading
						// TODO handle folder?
						forEach(fileLoadingUploadItems, (fileLoadingUploadItem) =>
							abort(fileLoadingUploadItem.id)
						);
						idsToRemove.push(...map(uploadItems, (uploadItem) => uploadItem.id));

						decrementAllParentsDenominatorByAmount(itemToRemove, itemToRemove.contentCount);
						decrementAllParentsCompletedByAmount(itemToRemove, itemToRemove.progress);
						decrementAllParentsFailedCountByAmount(itemToRemove, itemToRemove.failedCount);
					} else {
						abort(itemToRemove.id);
						idsToRemove.push(itemToRemove.id);
						decrementAllParentsDenominatorByAmount(itemToRemove, 1);
						if (itemToRemove.status === UploadStatus.COMPLETED) {
							decrementAllParentsCompletedByAmount(itemToRemove, 1);
						} else if (itemToRemove.status === UploadStatus.FAILED) {
							decrementAllParentsFailedCountByAmount(itemToRemove, 1);
						}
					}
				}
				removeFromParentChildren(itemToRemove);
			});

			UploadQueue.removeAndStartNext(...idsToRemove);

			uploadVarReducer({ type: 'remove', value: idsToRemove });
		},
		[abort]
	);

	const removeByNodeId = useCallback((nodeIds: Array<string>) => {
		const oldState = uploadVar();
		const partitions = partition(oldState, (item) => includes(nodeIds, item.nodeId));
		const removedNodes = map(partitions[0], (item) => item.id);
		// update reactive var only if there are removed nodes
		if (removedNodes.length > 0) {
			uploadVarReducer({ type: 'remove', value: removedNodes });
		}
	}, []);

	const removeAllCompleted = useCallback(() => {
		const state = uploadVar();
		const completedMainItems = filter(
			state,
			(item) => item.status === UploadStatus.COMPLETED && item.parentId === null
		);
		const completedIds = reduce<UploadItem, Array<string>>(
			completedMainItems,
			(accumulator: string[], item) => {
				if (item) {
					if (isUploadFolderItem(item)) {
						accumulator.push(...flatUploadItemChildrenIds(item.id));
					} else {
						accumulator.push(item.id);
					}
				}
				return accumulator;
			},
			[]
		);
		if (completedIds.length > 0) {
			uploadVarReducer({ type: 'remove', value: completedIds });
		}
	}, []);

	const retryById = useCallback((ids: Array<string>) => {
		forEach(ids, (id) => {
			const uploadItem = uploadVar()[id];
			if (uploadItem.status === UploadStatus.FAILED) {
				if (isUploadFolderItem(uploadItem)) {
					const itemsToSetAsQueued = flatUploadItemChildren(uploadItem, uploadVar());
					forEach(itemsToSetAsQueued, (item) => {
						if (item.status === UploadStatus.FAILED) {
							if (isUploadFolderItem(item)) {
								// decrement failed count only if the folder creation failed (nodeId === null)
								const failedCount = item.nodeId === null ? item.failedCount - 1 : item.failedCount;
								uploadVarReducer({
									type: 'update',
									value: {
										id: item.id,
										status: UploadStatus.QUEUED,
										failedCount
									}
								});
							} else {
								uploadVarReducer({
									type: 'update',
									value: {
										id: item.id,
										status: UploadStatus.QUEUED
									}
								});
							}
							UploadQueue.add(item.id);
							if (item.nodeId === null) {
								decrementAllParentsFailedCountByAmount(item, 1, uploadItem.id === item.id);
							}
						}
					});
				} else {
					uploadVarReducer({
						type: 'update',
						value: { id, status: UploadStatus.QUEUED, progress: 0 }
					});
					UploadQueue.add(id);
					decrementAllParentsFailedCountByAmount(uploadItem, 1);
				}
			}
		});

		UploadQueue.startAll();
	}, []);

	return { add, update, removeById, removeAllCompleted, retryById, removeByNodeId };
};
