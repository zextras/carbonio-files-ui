/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { ApolloError } from '@apollo/client';
import { faker } from '@faker-js/faker';
import { act, screen, waitFor, within } from '@testing-library/react';
import { EventEmitter } from 'events';
import { graphql, rest } from 'msw';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import server from '../../mocks/server';
import { REST_ENDPOINT, UPLOAD_PATH } from '../constants';
import { EMITTER_CODES, ICON_REGEXP } from '../constants/test';
import {
	UploadRequestBody,
	UploadRequestParams,
	UploadResponse
} from '../mocks/handleUploadFileRequest';
import {
	populateFile,
	populateFolder,
	populateLocalRoot,
	populateNodePage,
	populateNodes
} from '../mocks/mockUtils';
import {
	CreateFolderMutation,
	CreateFolderMutationVariables,
	Folder
} from '../types/graphql/types';
import { mockGetBaseNode } from '../utils/mockUtils';
import {
	createDataTransfer,
	delayUntil,
	generateError,
	setup,
	uploadWithDnD
} from '../utils/testUtils';
import { UploadQueue } from '../utils/uploadUtils';
import UploadView from './UploadView';

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest.fn(),
		removeCreateOptions: jest.fn()
	})
}));

describe('Upload View', () => {
	describe('Folder', () => {
		test('Progress for folders is shown as the number of completed items on the total number of items contained in the folder plus 1 (the folder itself)', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			folder.parent = localRoot;
			const subFolder = populateFolder();
			const children = [subFolder, populateFile()];
			children.forEach((child) => {
				child.parent = folder;
			});
			folder.children = populateNodePage(children);

			const dataTransferObj = createDataTransfer([folder]);

			const emitter = new EventEmitter();

			server.use(
				rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
					`${REST_ENDPOINT}${UPLOAD_PATH}`,
					async (req, res, ctx) => {
						await delayUntil(emitter, EMITTER_CODES.never);
						return res(ctx.json({ nodeId: faker.datatype.uuid() }));
					}
				)
			);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			setup(<UploadView />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);

			await uploadWithDnD(dropzone, dataTransferObj);
			await screen.findByText(subFolder.name);
			await screen.findByTestId(ICON_REGEXP.uploadCompleted);
			const mainFolderItem = screen
				.getAllByTestId('node-item', { exact: false })
				.find((item) => within(item).queryByText(folder.name) !== null) as HTMLElement;
			const subFolderItem = screen
				.getAllByTestId('node-item', { exact: false })
				.find((item) => within(item).queryByText(subFolder.name) !== null) as HTMLElement;
			expect(mainFolderItem).toBeDefined();
			expect(subFolderItem).toBeDefined();
			expect(within(mainFolderItem).getByText('2/3')).toBeVisible();
			expect(within(subFolderItem).getByText('1/1')).toBeVisible();

			act(() => {
				emitter.emit(EMITTER_CODES.never);
			});
		});

		test('A folder has status loading if at least one of the item of the content is loading', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			folder.parent = localRoot;
			const children = populateNodes(2, 'File');
			children.forEach((child) => {
				child.parent = folder;
			});
			folder.children = populateNodePage(children);

			const dataTransferObj = createDataTransfer([folder]);

			const emitter = new EventEmitter();

			let uploadRequestCount = 0;

			server.use(
				rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
					`${REST_ENDPOINT}${UPLOAD_PATH}`,
					async (req, res, ctx) => {
						if (uploadRequestCount > 0) {
							await delayUntil(emitter, EMITTER_CODES.never);
						}
						uploadRequestCount += 1;
						return res(ctx.json({ nodeId: faker.datatype.uuid() }));
					}
				)
			);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			setup(<UploadView />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);

			await uploadWithDnD(dropzone, dataTransferObj);
			await screen.findByText(/content/i);
			await screen.findByTestId(ICON_REGEXP.uploadCompleted);
			expect(screen.getByTestId(ICON_REGEXP.uploadCompleted));
			expect(screen.getAllByTestId(ICON_REGEXP.uploadLoading)).toHaveLength(2);
			expect(screen.getByText('2/3')).toBeVisible();

			act(() => {
				emitter.emit(EMITTER_CODES.never);
			});
		});

		test('A folder has status loading if at least one of the item of the content is queued', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			folder.parent = localRoot;
			const children = populateNodes(UploadQueue.LIMIT + 1, 'File');
			children.forEach((child) => {
				child.parent = folder;
			});
			folder.children = populateNodePage(children);
			const externalFiles = populateNodes(UploadQueue.LIMIT, 'File');

			const dataTransferObj = createDataTransfer([folder, ...externalFiles]);

			const emitter = new EventEmitter();

			// in order to have all items finished but one in queue, we need to
			// 1) complete the upload of the first 3 content items
			// 2) fail the upload of the 4th content item
			// 3) delay at infinite the upload of the 3 external items
			// 4) retry the upload of the failed content item -> this one should stay in queued status since there are 3 items uploading in queue
			server.use(
				rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
					`${REST_ENDPOINT}${UPLOAD_PATH}`,
					async (req, res, ctx) => {
						const fileName =
							req.headers.get('filename') && window.atob(req.headers.get('filename') as string);
						const childIndex = children.findIndex((child) => child.name === fileName);
						if (childIndex >= 0 && childIndex < UploadQueue.LIMIT) {
							return res(ctx.json({ nodeId: faker.datatype.uuid() }));
						}
						if (childIndex === UploadQueue.LIMIT) {
							return res(ctx.status(500));
						}
						await delayUntil(emitter, EMITTER_CODES.never);
						return res(ctx.json({ nodeId: faker.datatype.uuid() }));
					}
				)
			);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			const { user } = setup(<UploadView />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);

			await uploadWithDnD(dropzone, dataTransferObj);
			await screen.findByText(/content/i);
			// wait for the first 3 content items to complete
			await screen.findAllByTestId(ICON_REGEXP.uploadCompleted);
			// wait for the 4th one to fail (and so the folder to fail)
			await screen.findAllByTestId(ICON_REGEXP.uploadFailed);
			// now the external items should be loading
			await waitFor(() =>
				expect(screen.getAllByTestId(ICON_REGEXP.uploadLoading)).toHaveLength(UploadQueue.LIMIT)
			);
			// percentage 0% is visible on the 3 external items and the failed item
			expect(screen.getAllByText('0%')).toHaveLength(UploadQueue.LIMIT + 1);
			expect(screen.queryByText(/queued/i)).not.toBeInTheDocument();
			// now retry the upload of the failed item
			const failedItem = screen
				.getAllByTestId('details-node-item-', { exact: false })
				.find((item) => within(item).queryByTestId(ICON_REGEXP.uploadFailed) !== null);
			expect(failedItem).toBeDefined();
			await user.hover(failedItem as HTMLElement);
			await user.click(within(failedItem as HTMLElement).getByTestId(ICON_REGEXP.retryUpload));
			// only the item of the content has the queued label
			expect(screen.getByText(/queued/i)).toBeVisible();
			// loading icon is visible for the 3 external files, the queued item and the folder
			expect(screen.getAllByTestId(ICON_REGEXP.uploadLoading)).toHaveLength(5);
			// completed icon is visible only on the 3 content items
			expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(3);
			// failed icon is not visible anymore
			expect(screen.queryByTestId(ICON_REGEXP.uploadFailed)).not.toBeInTheDocument();
			// folder shows 4 completed items on 5 total items
			expect(screen.getByText('4/5')).toBeVisible();

			act(() => {
				emitter.emit(EMITTER_CODES.never);
			});
		});

		test('When a sub-item or the folder itself completes, the counter of the completed items is incremented by 1 in all the ancestors, independently from its depth inside the tree of content', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			folder.parent = localRoot;
			const level1File = populateFile();
			level1File.parent = folder;
			const level1Folder = populateFolder();
			level1Folder.parent = folder;
			folder.children = populateNodePage([level1File, level1Folder]);
			const level2Folder = populateFolder();
			level2Folder.parent = level1Folder;
			level1Folder.children = populateNodePage([level2Folder]);
			const level3File = populateFile();
			level3File.parent = level2Folder;
			level2Folder.children = populateNodePage([level3File]);

			const dataTransferObj = createDataTransfer([folder]);

			const emitter = new EventEmitter();

			const createFolderResponses = [folder, level1Folder, level2Folder];
			const createFolderMutation = jest.fn();
			const uploadFile = jest.fn();

			server.use(
				graphql.mutation<CreateFolderMutation, CreateFolderMutationVariables>(
					'createFolder',
					async (req, res, ctx) => {
						await delayUntil(emitter, EMITTER_CODES.success);
						createFolderMutation();
						const result = createFolderResponses.pop();
						if (result) {
							return res(
								ctx.data({
									createFolder: {
										...result,
										children: populateNodePage([]),
										// required to avoid circular structure JSON
										parent:
											(result.parent && {
												id: result.parent.id,
												name: result.parent.name,
												permissions: result.parent.permissions
											}) ||
											null
									} as Folder
								})
							);
						}
						return res(
							ctx.errors([
								new ApolloError({ graphQLErrors: [generateError('msw no more folders to create')] })
							])
						);
					}
				),
				rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
					`${REST_ENDPOINT}${UPLOAD_PATH}`,
					async (req, res, ctx) => {
						await delayUntil(emitter, EMITTER_CODES.success);
						uploadFile();
						return res(ctx.json({ nodeId: faker.datatype.uuid() }));
					}
				)
			);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			setup(<UploadView />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);

			await uploadWithDnD(dropzone, dataTransferObj);
			await screen.findByText(/content/i);
			await screen.findByText(level3File.name);
			// progress of main folder
			expect(screen.getByText('0/5')).toBeVisible();
			// progress of level 1 folder + progress of level 2 folder + progress of file 1 + progress of file 3
			expect(screen.getAllByText(/queued/i)).toHaveLength(4);

			// complete level 0 (create main folder)
			emitter.emit(EMITTER_CODES.success);
			await waitFor(() => expect(createFolderMutation).toHaveBeenCalled());
			await screen.findByText('1/5');
			// progress of main folder
			expect(screen.getByText('1/5')).toBeVisible();
			// progress of level 1 folder
			expect(screen.getByText('0/3')).toBeVisible();
			// progress of level 2 folder + progress of file 3
			expect(screen.getAllByText(/queued/i)).toHaveLength(2);

			// complete first level (create folder 1 and upload file 1)
			emitter.emit(EMITTER_CODES.success);
			await waitFor(() => expect(createFolderMutation).toHaveBeenCalledTimes(2));
			await waitFor(() => expect(uploadFile).toHaveBeenCalled());
			await screen.findByText('3/5');
			expect(screen.getByTestId(ICON_REGEXP.uploadCompleted)).toBeInTheDocument();
			// progress of main folder
			expect(screen.getByText('3/5')).toBeVisible();
			// progress of level 1 folder
			expect(screen.getByText('1/3')).toBeVisible();
			// progress of level 2 folder
			expect(screen.getByText(/queued/i)).toBeVisible();

			// complete second level (create folder 2)
			emitter.emit(EMITTER_CODES.success);
			await waitFor(() => expect(createFolderMutation).toHaveBeenCalledTimes(3));
			await screen.findByText('4/5');
			expect(screen.getByTestId(ICON_REGEXP.uploadCompleted)).toBeInTheDocument();
			// progress of main folder
			expect(screen.getByText('4/5')).toBeVisible();
			// progress of level 1 folder
			expect(screen.getByText('2/3')).toBeVisible();
			// progress of level 2 folder
			expect(screen.getByText('1/2')).toBeVisible();

			// complete third level (upload file 3)
			emitter.emit(EMITTER_CODES.success);
			await screen.findByText('5/5');
			await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(2));
			expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(5);
			// progress of main folder
			expect(screen.getByText('5/5')).toBeVisible();
			// progress of level 1 folder
			expect(screen.getByText('3/3')).toBeVisible();
			// progress of level 2 folder
			expect(screen.getByText('2/2')).toBeVisible();
		});

		test('A folder has status complete only when all the items of the content are in status completed', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			folder.parent = localRoot;
			const level1File = populateFile();
			level1File.parent = folder;
			const level1Folder = populateFolder();
			level1Folder.parent = folder;
			folder.children = populateNodePage([level1File, level1Folder]);
			const level2Folder = populateFolder();
			level2Folder.parent = level1Folder;
			level1Folder.children = populateNodePage([level2Folder]);
			const level3File = populateFile();
			level3File.parent = level2Folder;
			level2Folder.children = populateNodePage([level3File]);

			const dataTransferObj = createDataTransfer([folder]);

			const emitter = new EventEmitter();

			const createFolderResponses = [folder, level1Folder, level2Folder];
			const createFolderMutation = jest.fn();
			const uploadFile = jest.fn();

			server.use(
				graphql.mutation<CreateFolderMutation, CreateFolderMutationVariables>(
					'createFolder',
					async (req, res, ctx) => {
						await delayUntil(emitter, EMITTER_CODES.success);
						createFolderMutation();
						const result = createFolderResponses.pop();
						if (result) {
							return res(
								ctx.data({
									createFolder: {
										...result,
										children: populateNodePage([]),
										// required to avoid circular structure JSON
										parent:
											(result.parent && {
												id: result.parent.id,
												name: result.parent.name,
												permissions: result.parent.permissions
											}) ||
											null
									} as Folder
								})
							);
						}
						return res(
							ctx.errors([
								new ApolloError({ graphQLErrors: [generateError('msw no more folders to create')] })
							])
						);
					}
				),
				rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
					`${REST_ENDPOINT}${UPLOAD_PATH}`,
					async (req, res, ctx) => {
						await delayUntil(emitter, EMITTER_CODES.success);
						uploadFile();
						return res(ctx.json({ nodeId: faker.datatype.uuid() }));
					}
				)
			);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			setup(<UploadView />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);

			await uploadWithDnD(dropzone, dataTransferObj);
			await screen.findByText(/content/i);
			await screen.findByText(level3File.name);
			const mainFolderItem = screen
				.getAllByTestId('node-item', { exact: false })
				.find((item) => within(item).queryByText(folder.name) !== null) as HTMLElement;
			expect(mainFolderItem).toBeDefined();
			expect(within(mainFolderItem).getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();
			// complete level 0 (create main folder)
			emitter.emit(EMITTER_CODES.success);
			await waitFor(() => expect(createFolderMutation).toHaveBeenCalled());
			await screen.findByText('1/5');
			expect(within(mainFolderItem).getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();

			// complete first level (create folder 1 and upload file 1)
			emitter.emit(EMITTER_CODES.success);
			await waitFor(() => expect(createFolderMutation).toHaveBeenCalledTimes(2));
			await waitFor(() => expect(uploadFile).toHaveBeenCalled());
			await screen.findByText('3/5');
			expect(within(mainFolderItem).getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();

			// complete second level (create folder 2)
			emitter.emit(EMITTER_CODES.success);
			await waitFor(() => expect(createFolderMutation).toHaveBeenCalledTimes(3));
			await screen.findByText('4/5');
			expect(within(mainFolderItem).getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();

			// complete third level (upload file 3)
			emitter.emit(EMITTER_CODES.success);
			await screen.findByText('5/5');
			await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(2));
			expect(within(mainFolderItem).getByTestId(ICON_REGEXP.uploadCompleted)).toBeVisible();
		});

		test('If all items of the content of a folder finished, some with a failure, the progress of the folder shows only the completed items', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			folder.parent = localRoot;
			const level1File = populateFile();
			level1File.parent = folder;
			const level1Folder = populateFolder();
			level1Folder.parent = folder;
			folder.children = populateNodePage([level1File, level1Folder]);
			const level2Folder = populateFolder();
			level2Folder.parent = level1Folder;
			level1Folder.children = populateNodePage([level2Folder]);
			const level3File = populateFile();
			level3File.parent = level2Folder;
			level2Folder.children = populateNodePage([level3File]);

			const dataTransferObj = createDataTransfer([folder]);

			const emitter = new EventEmitter();

			const createFolderResponses = [folder, level1Folder, level2Folder];
			const createFolderMutation = jest.fn();
			const uploadFile = jest.fn();

			server.use(
				graphql.mutation<CreateFolderMutation, CreateFolderMutationVariables>(
					'createFolder',
					async (req, res, ctx) => {
						await delayUntil(emitter, EMITTER_CODES.success);
						createFolderMutation();
						const result = createFolderResponses.pop();
						if (result) {
							return res(
								ctx.data({
									createFolder: {
										...result,
										children: populateNodePage([]),
										// required to avoid circular structure JSON
										parent:
											(result.parent && {
												id: result.parent.id,
												name: result.parent.name,
												permissions: result.parent.permissions
											}) ||
											null
									} as Folder
								})
							);
						}
						return res(
							ctx.errors([
								new ApolloError({ graphQLErrors: [generateError('msw no more folders to create')] })
							])
						);
					}
				),
				rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
					`${REST_ENDPOINT}${UPLOAD_PATH}`,
					async (req, res, ctx) => {
						await delayUntil(emitter, EMITTER_CODES.fail);
						uploadFile();
						return res(ctx.status(500));
					}
				)
			);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			setup(<UploadView />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);

			await uploadWithDnD(dropzone, dataTransferObj);
			await screen.findByText(/content/i);
			await screen.findByText(level3File.name);
			const mainFolderItem = screen
				.getAllByTestId('node-item', { exact: false })
				.find((item) => within(item).queryByText(folder.name) !== null) as HTMLElement;
			expect(mainFolderItem).toBeDefined();
			expect(within(mainFolderItem).getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();
			// complete level 0 (create main folder)
			emitter.emit(EMITTER_CODES.success);
			await waitFor(() => expect(createFolderMutation).toHaveBeenCalled());
			await screen.findByText('1/5');
			expect(within(mainFolderItem).getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();

			// complete first level (create folder 1 and fail file 1)
			emitter.emit(EMITTER_CODES.fail);
			emitter.emit(EMITTER_CODES.success);
			await waitFor(() => expect(createFolderMutation).toHaveBeenCalledTimes(2));
			await waitFor(() => expect(uploadFile).toHaveBeenCalled());
			await screen.findByText('2/5');
			await screen.findAllByTestId(ICON_REGEXP.uploadFailed);
			expect(within(mainFolderItem).getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();

			// complete second level (create folder 2)
			emitter.emit(EMITTER_CODES.success);
			await waitFor(() => expect(createFolderMutation).toHaveBeenCalledTimes(3));
			await screen.findByText('3/5');
			expect(within(mainFolderItem).getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();

			// fail third level (upload file 3)
			emitter.emit(EMITTER_CODES.fail);
			// all the folders and the two files are in failed status
			await waitFor(() => expect(screen.getAllByTestId(ICON_REGEXP.uploadFailed)).toHaveLength(5));
			expect(within(mainFolderItem).getByTestId(ICON_REGEXP.uploadFailed)).toBeVisible();
			expect(screen.getByText('3/5')).toBeVisible();
		});

		test('If all items of the content of a folder finished, and at least one is failed, the status of the folder is failed', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			folder.parent = localRoot;
			const children = populateNodes(5, 'File');
			children.forEach((child) => {
				child.parent = folder;
			});
			folder.children = populateNodePage(children);

			const dataTransferObj = createDataTransfer([folder]);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			server.use(
				rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
					`${REST_ENDPOINT}${UPLOAD_PATH}`,
					(req, res, ctx) => {
						const fileName =
							req.headers.get('filename') && window.atob(req.headers.get('filename') as string);
						if (fileName === children[children.length - 1].name) {
							return res(ctx.status(500));
						}
						return res(ctx.json({ nodeId: faker.datatype.uuid() }));
					}
				)
			);

			setup(<UploadView />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);
			await uploadWithDnD(dropzone, dataTransferObj);

			await screen.findByText(children[children.length - 1].name);
			await waitFor(() =>
				expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(children.length - 1)
			);
			await screen.findAllByTestId(ICON_REGEXP.uploadFailed);
			expect(screen.getAllByTestId(ICON_REGEXP.uploadFailed)).toHaveLength(2);
			const mainFolderItem = screen
				.getAllByTestId('node-item', { exact: false })
				.find((item) => within(item).queryByText(folder.name) !== null) as HTMLElement;
			expect(mainFolderItem).toBeDefined();
			expect(within(mainFolderItem).getByTestId(ICON_REGEXP.uploadFailed)).toBeVisible();
			expect(
				within(mainFolderItem).queryByTestId(ICON_REGEXP.uploadCompleted)
			).not.toBeInTheDocument();
		});

		test('If all items of the content of a folder finished, all with success, the progress of the folder shows the total count of items on both values of the fraction', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder(10);
			folder.parent = localRoot;
			const subFolder = populateFolder(10);
			folder.children.nodes.push(subFolder);
			const subSubFolder = populateFolder();
			subFolder.children.nodes.push(subSubFolder);

			const totalItemsCount =
				folder.children.nodes.length +
				subFolder.children.nodes.length +
				subSubFolder.children.nodes.length +
				1;

			const dataTransferObj = createDataTransfer([folder]);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			setup(<UploadView />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);
			await uploadWithDnD(dropzone, dataTransferObj);

			await screen.findByText(subSubFolder.name);
			await waitFor(() =>
				expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(totalItemsCount)
			);
			expect(screen.getByText(`${totalItemsCount}/${totalItemsCount}`)).toBeVisible();
		});

		test('If there is at least one item of the content of a folder still loading, the status of the folder is also loading', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder();
			folder.parent = localRoot;
			const level1Folder = populateFolder();
			level1Folder.parent = folder;
			folder.children = populateNodePage([level1Folder]);
			const level2Folder = populateFolder();
			level2Folder.parent = level1Folder;
			level1Folder.children = populateNodePage([level2Folder]);
			const level3File = populateFile();
			level3File.parent = level2Folder;
			level2Folder.children = populateNodePage([level3File]);

			const dataTransferObj = createDataTransfer([folder]);

			const emitter = new EventEmitter();

			server.use(
				rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
					`${REST_ENDPOINT}${UPLOAD_PATH}`,
					async (req, res, ctx) =>
						Promise.any([
							delayUntil(emitter, EMITTER_CODES.never).then(() =>
								res(ctx.status(XMLHttpRequest.UNSENT))
							)
						])
				)
			);

			const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

			setup(<UploadView />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);

			await uploadWithDnD(dropzone, dataTransferObj);
			await screen.findByText(/content/i);
			await screen.findByText(level3File.name);
			const mainFolderItem = screen
				.getAllByTestId('node-item', { exact: false })
				.find((item) => within(item).queryByText(folder.name) !== null) as HTMLElement;
			expect(mainFolderItem).toBeDefined();
			expect(within(mainFolderItem).getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();
			await screen.findByText('0/4');
			await waitFor(() => expect(screen.queryByText(/queued/i)).not.toBeInTheDocument());
			await screen.findByText('3/4');
			// each item is still in loading because the leaf is still loading
			expect(screen.queryByTestId(ICON_REGEXP.uploadCompleted)).not.toBeInTheDocument();
			expect(screen.getAllByTestId(ICON_REGEXP.uploadLoading)).toHaveLength(4);
			expect(within(mainFolderItem).getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();

			act(() => {
				emitter.emit(EMITTER_CODES.never);
			});
		});

		describe('Remove action', () => {
			test('Remove on a loading item of the content decrement content counter on parents', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				folder.parent = localRoot;
				const level1Folder = populateFolder();
				level1Folder.parent = folder;
				folder.children = populateNodePage([level1Folder]);
				const level2Folder = populateFolder();
				level2Folder.parent = level1Folder;
				level1Folder.children = populateNodePage([level2Folder]);
				const level3File = populateFile();
				level3File.parent = level2Folder;
				level2Folder.children = populateNodePage([level3File]);

				const dataTransferObj = createDataTransfer([folder]);

				const emitter = new EventEmitter();

				server.use(
					rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
						`${REST_ENDPOINT}${UPLOAD_PATH}`,
						async (req, res, ctx) =>
							Promise.any([
								delayUntil(emitter, EMITTER_CODES.never).then(() =>
									res(ctx.status(XMLHttpRequest.UNSENT))
								)
							])
					)
				);

				const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

				const { user } = setup(<UploadView />, { mocks });

				const dropzone = await screen.findByText(/nothing here/i);

				await uploadWithDnD(dropzone, dataTransferObj);
				await screen.findByText(/content/i);
				await screen.findByText(level3File.name);
				await screen.findByText('3/4');
				expect(screen.getByText('3/4')).toBeVisible();
				expect(screen.getByText('2/3')).toBeVisible();
				expect(screen.getByText('1/2')).toBeVisible();

				const fileItem = screen
					.getAllByTestId('node-item', { exact: false })
					.find((item) => within(item).queryByText(level3File.name) !== null) as HTMLElement;
				expect(fileItem).toBeDefined();

				await user.click(within(fileItem).getByTestId(ICON_REGEXP.removeUpload));
				await screen.findAllByTestId(ICON_REGEXP.uploadCompleted);

				expect(screen.getByText('3/3')).toBeVisible();
				expect(screen.getByText('2/2')).toBeVisible();
				expect(screen.getByText('1/1')).toBeVisible();

				act(() => {
					emitter.emit(EMITTER_CODES.never);
				});
			});

			test('Remove on a completed item of the content decrement both completed and content counter on parents', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				folder.parent = localRoot;
				const level1Folder = populateFolder();
				level1Folder.parent = folder;
				const level1File = populateFile();
				level1File.parent = folder;
				folder.children = populateNodePage([level1Folder, level1File]);
				const level2Folder = populateFolder();
				level2Folder.parent = level1Folder;
				level1Folder.children = populateNodePage([level2Folder]);
				const level3File = populateFile();
				level3File.parent = level2Folder;
				level2Folder.children = populateNodePage([level3File]);

				const dataTransferObj = createDataTransfer([folder]);

				const emitter = new EventEmitter();

				server.use(
					rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
						`${REST_ENDPOINT}${UPLOAD_PATH}`,
						async (req, res, ctx) =>
							Promise.any([
								delayUntil(emitter, EMITTER_CODES.never).then(() =>
									res(ctx.status(XMLHttpRequest.UNSENT))
								)
							])
					)
				);

				const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

				const { user } = setup(<UploadView />, { mocks });

				const dropzone = await screen.findByText(/nothing here/i);

				await uploadWithDnD(dropzone, dataTransferObj);
				await screen.findByText(/content/i);
				await screen.findByText(level2Folder.name);
				await screen.findByText('3/5');
				expect(screen.getByText('3/5')).toBeVisible();
				expect(screen.getByText('2/3')).toBeVisible();

				const folder2Item = screen
					.getAllByTestId('node-item', { exact: false })
					.find((item) => within(item).queryByText(level2Folder.name) !== null) as HTMLElement;
				expect(folder2Item).toBeDefined();

				expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(5);
				await user.click(within(folder2Item).getByTestId(ICON_REGEXP.removeUpload));
				await waitFor(() =>
					expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(3)
				);

				expect(screen.getByText('2/3')).toBeVisible();
				expect(screen.getByText('1/1')).toBeVisible();

				act(() => {
					emitter.emit(EMITTER_CODES.never);
				});
			});

			test('Remove on a failed item of the content decrement content counter on parents', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				folder.parent = localRoot;
				const level1Folder = populateFolder();
				level1Folder.parent = folder;
				const level1File = populateFile();
				level1File.parent = folder;
				folder.children = populateNodePage([level1Folder, level1File]);
				const level2Folder = populateFolder();
				level2Folder.parent = level1Folder;
				level1Folder.children = populateNodePage([level2Folder]);
				const level3File = populateFile();
				level3File.parent = level2Folder;
				level2Folder.children = populateNodePage([level3File]);

				const dataTransferObj = createDataTransfer([folder]);

				server.use(
					rest.post<UploadRequestBody, UploadRequestParams, UploadResponse>(
						`${REST_ENDPOINT}${UPLOAD_PATH}`,
						async (req, res, ctx) => res(ctx.status(500))
					)
				);

				const mocks = [mockGetBaseNode({ node_id: localRoot.id }, localRoot)];

				const { user } = setup(<UploadView />, { mocks });

				const dropzone = await screen.findByText(/nothing here/i);

				await uploadWithDnD(dropzone, dataTransferObj);
				await screen.findByText(/content/i);
				await screen.findByText(level3File.name);
				await waitFor(() =>
					expect(screen.getAllByTestId(ICON_REGEXP.uploadFailed)).toHaveLength(5)
				);
				expect(screen.getByText('3/5')).toBeVisible();
				expect(screen.getByText('2/3')).toBeVisible();
				expect(screen.getByText('1/2')).toBeVisible();

				const file3Item = screen
					.getAllByTestId('node-item', { exact: false })
					.find((item) => within(item).queryByText(level3File.name) !== null) as HTMLElement;
				expect(file3Item).toBeDefined();

				expect(within(file3Item).getByTestId(ICON_REGEXP.removeUpload)).toBeInTheDocument();
				expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(5);
				await user.click(within(file3Item).getByTestId(ICON_REGEXP.removeUpload));
				await screen.findByText('3/4');
				await waitFor(() =>
					expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(4)
				);

				expect(screen.getByText('3/4')).toBeVisible();
				expect(screen.getByText('2/2')).toBeVisible();
				expect(screen.getByText('1/1')).toBeVisible();
				expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(2);
				expect(screen.getAllByTestId(ICON_REGEXP.uploadFailed)).toHaveLength(2);
			});
		});
	});
});
