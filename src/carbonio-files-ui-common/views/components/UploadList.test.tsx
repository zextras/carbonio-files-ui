/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import {
	act,
	fireEvent,
	screen,
	waitFor,
	waitForElementToBeRemoved,
	within
} from '@testing-library/react';
import { EventEmitter } from 'events';
import { forEach, find } from 'lodash';
import { rest } from 'msw';

import server from '../../../mocks/server';
import { uploadVar } from '../../apollo/uploadVar';
import { REST_ENDPOINT, ROOTS, UPLOAD_PATH } from '../../constants';
import { EMITTER_CODES, ICON_REGEXP } from '../../constants/test';
import handleUploadFileRequest, {
	UploadRequestBody,
	UploadRequestParams,
	UploadResponse
} from '../../mocks/handleUploadFileRequest';
import {
	populateFile,
	populateFolder,
	populateLocalRoot,
	populateNodes
} from '../../mocks/mockUtils';
import { Node } from '../../types/common';
import { UploadItem, UploadStatus } from '../../types/graphql/client-types';
import {
	File as FilesFile,
	Folder,
	GetChildrenQuery,
	GetChildrenQueryVariables,
	Maybe
} from '../../types/graphql/types';
import {
	getChildrenVariables,
	mockCreateFolder,
	mockGetBaseNode,
	mockGetChildren
} from '../../utils/mockUtils';
import {
	buildBreadCrumbRegExp,
	createDataTransfer,
	delayUntil,
	setup,
	uploadWithDnD
} from '../../utils/testUtils';
import { UploadQueue } from '../../utils/uploadUtils';
import { UploadList } from './UploadList';

describe('Upload list', () => {
	test('Show upload crumbs', async () => {
		const { getByTextWithMarkup } = setup(<UploadList />);
		await screen.findByText(/nothing here/i);
		expect(getByTextWithMarkup(buildBreadCrumbRegExp('Uploads'))).toBeVisible();
	});

	describe('Drag and drop', () => {
		test('Drag of files in the upload list shows upload dropzone with dropzone message. Drop triggers upload in local root', async () => {
			const localRoot = populateFolder(0, ROOTS.LOCAL_ROOT);
			const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
			forEach(uploadedFiles, (file) => {
				file.parent = localRoot;
			});

			// write local root data in cache as if it was already loaded
			const getChildrenMockedQuery = mockGetChildren(getChildrenVariables(localRoot.id), localRoot);
			global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				...getChildrenMockedQuery.request,
				data: {
					getNode: localRoot
				}
			});

			const dataTransferObj = createDataTransfer(uploadedFiles);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			setup(<UploadList />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);

			await uploadWithDnD(dropzone, dataTransferObj);

			expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(
				uploadedFiles.length
			);
			expect(screen.queryByText(/Drop here your attachments/m)).not.toBeInTheDocument();

			await screen.findAllByTestId(ICON_REGEXP.uploadCompleted);

			expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(uploadedFiles.length);

			const localRootCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>(getChildrenMockedQuery.request);

			expect(
				(localRootCachedData?.getNode as Maybe<Folder> | undefined)?.children.nodes || []
			).toHaveLength(uploadedFiles.length);
		});

		test('Drag of a node is not permitted and does nothing', async () => {
			const localRoot = populateFolder(0, ROOTS.LOCAL_ROOT);
			const uploadedFiles = populateNodes(2, 'File') as FilesFile[];
			const files: File[] = [];
			forEach(uploadedFiles, (file) => {
				file.parent = localRoot;
				files.push(new File(['(⌐□_□)'], file.name, { type: file.mime_type }));
			});

			const uploadMap: { [id: string]: UploadItem } = {};
			forEach(uploadedFiles, (file, index) => {
				uploadMap[file.id] = {
					file: files[index],
					parentNodeId: localRoot.id,
					nodeId: file.id,
					status: UploadStatus.COMPLETED,
					progress: 100,
					id: file.id,
					name: files[index].name,
					fullPath: files[index].webkitRelativePath,
					parentId: null
				};
			});

			uploadVar(uploadMap);

			const nodesToDrag = [uploadedFiles[0]];

			let dataTransferData: Record<string, string> = {};
			let dataTransferTypes: string[] = [];
			const dataTransfer = (): unknown => ({
				setDragImage: jest.fn(),
				items: dataTransferData,
				setData: jest.fn().mockImplementation((type: string, data: string) => {
					dataTransferData[type] = data;
					dataTransferTypes.includes(type) || dataTransferTypes.push(type);
				}),
				getData: jest.fn().mockImplementation((type: string) => dataTransferData[type]),
				types: dataTransferTypes,
				clearData: jest.fn().mockImplementation(() => {
					dataTransferTypes = [];
					dataTransferData = {};
				})
			});

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			setup(<UploadList />, { mocks });

			const itemToDrag = await screen.findByText(nodesToDrag[0].name);
			fireEvent.dragStart(itemToDrag, { dataTransfer: dataTransfer() });
			fireEvent.dragEnter(itemToDrag, { dataTransfer: dataTransfer() });
			// drag image item is not shown
			const draggedNodeItem = screen.getByText(nodesToDrag[0].name);
			expect(draggedNodeItem).toBeInTheDocument();
			expect(draggedNodeItem).not.toHaveAttribute('disabled', '');
			expect(screen.queryByTestId('dropzone-overlay')).not.toBeInTheDocument();
		});

		test('Drop of mixed files and folder in the upload list create folder and upload file', async () => {
			const localRoot = populateFolder(0, ROOTS.LOCAL_ROOT);
			const uploadedFiles = [populateFolder(), populateFile()];
			// folder
			uploadedFiles[0].parent = localRoot;
			// file
			uploadedFiles[1].parent = localRoot;

			// write local root data in cache as if it was already loaded
			const getChildrenMockedQuery = mockGetChildren(getChildrenVariables(localRoot.id), localRoot);
			global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				...getChildrenMockedQuery.request,
				data: {
					getNode: localRoot
				}
			});

			const dataTransferObj = createDataTransfer(uploadedFiles);

			const mocks = [
				mockGetBaseNode({ node_id: localRoot.id }, localRoot),
				mockCreateFolder(
					{ name: uploadedFiles[0].name, destination_id: uploadedFiles[0].parent.id },
					uploadedFiles[0]
				)
			];

			setup(<UploadList />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);

			await uploadWithDnD(dropzone, dataTransferObj);
			expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(
				uploadedFiles.length
			);
			expect(screen.queryByText(/Drop here your attachments/m)).not.toBeInTheDocument();

			await waitFor(() => {
				const localRootCachedData = global.apolloClient.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>(getChildrenMockedQuery.request);
				return expect(
					(localRootCachedData?.getNode as Maybe<Folder> | undefined)?.children.nodes || []
				).toHaveLength(uploadedFiles.length);
			});

			expect(screen.getByText(uploadedFiles[0].name)).toBeVisible();
			expect(screen.getAllByTestId(ICON_REGEXP.uploadLoading)).toHaveLength(2);
			expect(screen.getByText(uploadedFiles[1].name)).toBeVisible();
			await waitFor(() =>
				expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(2)
			);
			expect(screen.getByText(/1\/1/)).toBeVisible();
		});

		test('upload more then 3 files in the upload list queues excess elements', async () => {
			const localRoot = populateFolder(0, ROOTS.LOCAL_ROOT);
			const uploadedFiles = populateNodes(4, 'File') as FilesFile[];
			forEach(uploadedFiles, (file) => {
				file.parent = localRoot;
			});

			const emitter = new EventEmitter();

			// write local root data in cache as if it was already loaded
			const getChildrenMockedQuery = mockGetChildren(getChildrenVariables(localRoot.id), localRoot);
			global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
				...getChildrenMockedQuery.request,
				data: {
					getNode: localRoot
				}
			});

			server.use(
				rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
					`${REST_ENDPOINT}${UPLOAD_PATH}`,
					async (req, res, ctx) => {
						await delayUntil(emitter, EMITTER_CODES.success);
						return res(
							ctx.json({
								nodeId: faker.datatype.uuid()
							})
						);
					}
				)
			);

			const dataTransferObj = createDataTransfer(uploadedFiles);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			setup(<UploadList />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);

			await uploadWithDnD(dropzone, dataTransferObj);

			const loadingIcons = await screen.findAllByTestId(ICON_REGEXP.uploadLoading);
			expect(loadingIcons).toHaveLength(4);

			await screen.findAllByText(/\d+%/);

			expect(screen.getByText(/queued/i)).toBeInTheDocument();
			expect(screen.getAllByText(/\d+%/i)).toHaveLength(3);

			const queuedItem = find(
				screen.getAllByTestId('node-item', { exact: false }),
				(item) => within(item).queryByText(/queued/i) !== null
			) as HTMLElement;
			expect(queuedItem).toBeDefined();
			expect(within(queuedItem).getByText(/queued/i)).toBeVisible();
			const queuedIconLoader = within(queuedItem).getByTestId(ICON_REGEXP.uploadLoading);
			expect(queuedIconLoader).toBeInTheDocument();

			const loadingItems = await screen.findAllByText('0%');
			expect(loadingItems).toHaveLength(3);

			expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(
				uploadedFiles.length
			);
			expect(screen.queryByText(/Drop here your attachments/m)).not.toBeInTheDocument();

			emitter.emit(EMITTER_CODES.success);
			await screen.findAllByText('100%');
			expect(screen.queryByText(/queued/i)).not.toBeInTheDocument();
			expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(3);
			expect(screen.getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();
			emitter.emit(EMITTER_CODES.success);
			await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.uploadLoading));
			expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(4);
			expect(screen.queryByTestId(ICON_REGEXP.uploadLoading)).not.toBeInTheDocument();

			const localRootCachedData = global.apolloClient.readQuery<
				GetChildrenQuery,
				GetChildrenQueryVariables
			>(getChildrenMockedQuery.request);
			expect(
				(localRootCachedData?.getNode as Maybe<Folder> | undefined)?.children.nodes || []
			).toHaveLength(uploadedFiles.length);
		});

		test('when an uploading item fails, the next in the queue is uploaded', async () => {
			const localRoot = populateLocalRoot();
			const uploadedFiles = populateNodes(4, 'File') as FilesFile[];
			forEach(uploadedFiles, (file) => {
				file.parent = localRoot;
			});

			const emitter = new EventEmitter();

			server.use(
				rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
					`${REST_ENDPOINT}${UPLOAD_PATH}`,
					async (req, res, ctx) => {
						const fileName =
							req.headers.get('filename') && window.atob(req.headers.get('filename') as string);
						if (fileName === uploadedFiles[0].name) {
							await delayUntil(emitter, EMITTER_CODES.fail);
							return res(ctx.status(500));
						}
						await delayUntil(emitter, EMITTER_CODES.success);
						return res(ctx.json({ nodeId: faker.datatype.uuid() }));
					}
				)
			);

			const dataTransferObj = createDataTransfer(uploadedFiles);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			setup(<UploadList />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);

			await uploadWithDnD(dropzone, dataTransferObj);

			expect(screen.getAllByTestId('node-item-', { exact: false })).toHaveLength(
				uploadedFiles.length
			);
			expect(screen.getAllByTestId(ICON_REGEXP.uploadLoading)).toHaveLength(uploadedFiles.length);
			expect(screen.getByText(/queued/i)).toBeVisible();
			emitter.emit(EMITTER_CODES.fail);
			// wait for the first request to fail
			await screen.findByTestId(ICON_REGEXP.uploadFailed);
			// last item is removed from the queue and starts the upload
			expect(screen.queryByText(/queued/i)).not.toBeInTheDocument();
			emitter.emit(EMITTER_CODES.success);
			// then wait for all other files to be uploaded
			await waitFor(() =>
				expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(3)
			);
			expect(screen.getByTestId(ICON_REGEXP.uploadFailed)).toBeVisible();
			expect(screen.queryByText(/queued/i)).not.toBeInTheDocument();
			expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(3);
			expect(screen.queryByTestId(ICON_REGEXP.uploadLoading)).not.toBeInTheDocument();
		});

		test('when an uploading item is aborted, the next in the queue is uploaded', async () => {
			const localRoot = populateLocalRoot();
			const uploadedFiles = populateNodes(4, 'File') as FilesFile[];
			forEach(uploadedFiles, (file) => {
				file.parent = localRoot;
			});

			const emitter = new EventEmitter();

			server.use(
				rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
					`${REST_ENDPOINT}${UPLOAD_PATH}`,
					async (req, res, ctx) => {
						const fileName =
							req.headers.get('filename') && window.atob(req.headers.get('filename') as string);
						if (fileName === uploadedFiles[0].name) {
							await delayUntil(emitter, EMITTER_CODES.never);
							return res(ctx.status(XMLHttpRequest.UNSENT));
						}
						await delayUntil(emitter, EMITTER_CODES.success);
						return res(ctx.json({ nodeId: faker.datatype.uuid() }));
					}
				)
			);

			const dataTransferObj = createDataTransfer(uploadedFiles);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			const { user } = setup(<UploadList />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);

			await uploadWithDnD(dropzone, dataTransferObj);

			await screen.findAllByTestId('node-item-', { exact: false });
			expect(screen.getAllByTestId('node-item-', { exact: false })).toHaveLength(
				uploadedFiles.length
			);
			expect(screen.getAllByTestId(ICON_REGEXP.uploadLoading)).toHaveLength(uploadedFiles.length);
			expect(screen.getByText(/queued/i)).toBeVisible();
			const firstFileItem = screen.getAllByTestId('node-item-', { exact: false })[0];
			expect(screen.getByText(uploadedFiles[0].name)).toBeVisible();
			const cancelAction = within(firstFileItem).getByTestId(ICON_REGEXP.removeUpload);
			await user.click(cancelAction);
			// first upload is aborted, element is removed from the list
			expect(firstFileItem).not.toBeInTheDocument();
			// last item upload is started, element is removed from the queue
			expect(screen.queryByText(/queued/i)).not.toBeInTheDocument();
			// then wait for all other files to be uploaded
			emitter.emit(EMITTER_CODES.success);
			await waitForElementToBeRemoved(screen.queryAllByTestId(ICON_REGEXP.uploadLoading));
			expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(3);
			expect(screen.getAllByTestId('node-item-', { exact: false })).toHaveLength(
				uploadedFiles.length - 1
			);
			expect(screen.queryByText(uploadedFiles[0].name)).not.toBeInTheDocument();
			expect(screen.queryByText(/queued/i)).not.toBeInTheDocument();
			expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(3);
			expect(screen.queryByTestId(ICON_REGEXP.uploadLoading)).not.toBeInTheDocument();

			act(() => {
				emitter.emit(EMITTER_CODES.never);
			});
		});

		test('the queue use FIFO strategy', async () => {
			const localRoot = populateLocalRoot();
			const uploadedFiles = populateNodes(UploadQueue.LIMIT * 3, 'File') as FilesFile[];
			forEach(uploadedFiles, (file) => {
				file.parent = localRoot;
			});

			const emitter = new EventEmitter();

			server.use(
				rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
					`${REST_ENDPOINT}${UPLOAD_PATH}`,
					async (req, res, ctx) => {
						const fileName =
							req.headers.get('filename') && window.atob(req.headers.get('filename') as string);
						const result =
							find(uploadedFiles, (uploadedFile) => uploadedFile.name === fileName)?.id ||
							faker.datatype.uuid();
						await delayUntil(emitter, EMITTER_CODES.success);
						return res(ctx.json({ nodeId: result }));
					}
				)
			);

			const dataTransferObj1 = createDataTransfer(uploadedFiles.slice(0, 4));

			const dataTransferObj2 = createDataTransfer(uploadedFiles.slice(4));

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			setup(<UploadList />, { mocks });

			const dropzone1 = await screen.findByText(/nothing here/i);
			// drag and drop first 4 files
			await uploadWithDnD(dropzone1, dataTransferObj1);
			// immediately drag and drop the last two files
			const dropzone2 = screen.getByText(uploadedFiles[0].name);
			await uploadWithDnD(dropzone2, dataTransferObj2);
			expect(screen.getAllByTestId('node-item-', { exact: false })).toHaveLength(
				uploadedFiles.length
			);
			expect(screen.getAllByTestId(ICON_REGEXP.uploadLoading)).toHaveLength(uploadedFiles.length);
			// last files are queued
			expect(screen.getAllByText(/queued/i)).toHaveLength(uploadedFiles.length - UploadQueue.LIMIT);
			const nodeItems = screen.getAllByTestId('node-item-', { exact: false });
			forEach(nodeItems, (nodeItem, index) => {
				if (index < UploadQueue.LIMIT) {
					expect(within(nodeItem).getByText(/\d+%/)).toBeVisible();
					expect(within(nodeItem).queryByText(/queued/i)).not.toBeInTheDocument();
				} else {
					expect(within(nodeItem).getByText(/queued/i)).toBeVisible();
					expect(within(nodeItem).queryByText(/\d+%/)).not.toBeInTheDocument();
				}
			});
			emitter.emit(EMITTER_CODES.success);
			await waitFor(() =>
				expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(UploadQueue.LIMIT)
			);
			expect(
				within(nodeItems[UploadQueue.LIMIT - 1]).queryByText(/queued/i)
			).not.toBeInTheDocument();
			expect(
				within(nodeItems[UploadQueue.LIMIT - 1]).getByTestId(ICON_REGEXP.uploadCompleted)
			).toBeVisible();
			expect(within(nodeItems[UploadQueue.LIMIT]).queryByText(/queued/i)).not.toBeInTheDocument();
			expect(within(nodeItems[UploadQueue.LIMIT]).getByText(/\d+%/i)).toBeVisible();
			expect(within(nodeItems[UploadQueue.LIMIT * 2]).getByText(/queued/i)).toBeVisible();
			expect(within(nodeItems[uploadedFiles.length - 1]).getByText(/queued/i)).toBeVisible();
			emitter.emit(EMITTER_CODES.success);
			await waitFor(() =>
				expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(
					UploadQueue.LIMIT * 2
				)
			);
			expect(within(nodeItems[UploadQueue.LIMIT * 2]).getByText(/\d+%/i)).toBeVisible();
			expect(
				within(nodeItems[UploadQueue.LIMIT * 2]).queryByText(/queued/i)
			).not.toBeInTheDocument();
			expect(
				within(nodeItems[uploadedFiles.length - 1]).queryByText(/queued/i)
			).not.toBeInTheDocument();
			expect(within(nodeItems[uploadedFiles.length - 1]).getByText(/\d+%/)).toBeVisible();
			emitter.emit(EMITTER_CODES.success);
			await waitFor(() =>
				expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(
					uploadedFiles.length
				)
			);
			expect(screen.queryByText(/queued/i)).not.toBeInTheDocument();
		});

		test('Drop of a folder creates the folders and upload all the files of the tree hierarchy', async () => {
			const localRoot = populateFolder(0, ROOTS.LOCAL_ROOT);
			const folderToUpload = populateFolder();
			folderToUpload.parent = localRoot;
			const subFolder1 = populateFolder();
			const subFolder2 = populateFolder();
			folderToUpload.children.nodes.push(populateFile(), subFolder1);
			forEach(folderToUpload.children.nodes, (child) => {
				(child as Node).parent = folderToUpload;
			});
			subFolder1.children.nodes.push(...populateNodes(2, 'File'), subFolder2);
			forEach(subFolder1.children.nodes, (child) => {
				(child as Node).parent = subFolder1;
			});
			subFolder2.children.nodes.push(...populateNodes(3, 'File'));
			forEach(subFolder2.children.nodes, (child) => {
				(child as Node).parent = subFolder2;
			});
			const numberOfFiles = 6; // number of files to upload considering all the tree
			const numberOfFolders = 3;
			const numberOfNodes = numberOfFiles + numberOfFolders;

			const dataTransferObj = createDataTransfer([folderToUpload]);

			const uploadFileHandler = jest.fn(handleUploadFileRequest);

			server.use(
				rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
					`${REST_ENDPOINT}${UPLOAD_PATH}`,
					uploadFileHandler
				)
			);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			setup(<UploadList />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);

			await uploadWithDnD(dropzone, dataTransferObj);

			await screen.findByText(folderToUpload.name);

			expect(screen.getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();
			expect(screen.getByText(RegExp(`\\d/${numberOfNodes}`))).toBeVisible();
			expect(screen.getByTestId('node-item', { exact: false })).toBeInTheDocument();
			expect(screen.queryByText(/Drop here your attachments/m)).not.toBeInTheDocument();

			await waitFor(() => expect(uploadFileHandler).toHaveBeenCalledTimes(numberOfFiles));

			await screen.findByTestId(ICON_REGEXP.uploadCompleted);

			expect(screen.getByTestId(ICON_REGEXP.uploadCompleted)).toBeVisible();
			expect(screen.getByText(RegExp(`${numberOfNodes}/${numberOfNodes}`))).toBeVisible();
		});
	});
});
