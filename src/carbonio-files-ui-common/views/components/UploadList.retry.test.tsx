/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { ApolloError } from '@apollo/client';
import { faker } from '@faker-js/faker';
import { screen, waitFor } from '@testing-library/react';
import { EventEmitter } from 'events';
import { forEach, keyBy } from 'lodash';
import { graphql, http, HttpResponse } from 'msw';

import { UploadList } from './UploadList';
import server from '../../../mocks/server';
import { uploadVar } from '../../apollo/uploadVar';
import { REST_ENDPOINT, ROOTS, UPLOAD_PATH } from '../../constants';
import { EMITTER_CODES, ICON_REGEXP, SELECTORS } from '../../constants/test';
import handleUploadFileRequest, {
	UploadRequestBody,
	UploadRequestParams,
	UploadResponse
} from '../../mocks/handleUploadFileRequest';
import {
	populateFolder,
	populateLocalRoot,
	populateNodePage,
	populateNodes,
	populateUploadItems
} from '../../mocks/mockUtils';
import {
	createUploadDataTransfer,
	delayUntil,
	generateError,
	selectNodes,
	setup,
	uploadWithDnD
} from '../../tests/utils';
import { UploadStatus } from '../../types/graphql/client-types';
import { Resolvers } from '../../types/graphql/resolvers-types';
import {
	CreateFolderDocument,
	CreateFolderMutation,
	CreateFolderMutationVariables,
	Folder
} from '../../types/graphql/types';
import { mockGetNode } from '../../utils/resolverMocks';

describe('Upload List', () => {
	describe('Retry', () => {
		describe('Selection Mode', () => {
			test('Action is visible if all selected items are failed', async () => {
				const uploadItems = populateUploadItems(3);
				forEach(uploadItems, (item) => {
					item.status = UploadStatus.FAILED;
					item.parentNodeId = ROOTS.LOCAL_ROOT;
				});
				const uploadMap = keyBy(uploadItems, 'id');

				uploadVar(uploadMap);
				const localRoot = populateLocalRoot();

				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [localRoot] })
					}
				} satisfies Partial<Resolvers>;
				const { user, getByRoleWithIcon, queryByRoleWithIcon } = setup(<UploadList />, {
					mocks
				});

				expect(screen.getByText(uploadItems[0].name)).toBeVisible();
				expect(screen.getAllByTestId(ICON_REGEXP.uploadFailed)).toHaveLength(uploadItems.length);
				await selectNodes(Object.keys(uploadMap), user);
				expect(screen.getByText(/deselect all/i)).toBeVisible();
				expect(
					queryByRoleWithIcon('button', { icon: ICON_REGEXP.moreVertical })
				).not.toBeInTheDocument();
				expect(getByRoleWithIcon('button', { icon: ICON_REGEXP.retryUpload })).toBeVisible();
			});

			test('Action is hidden if at least one selected item is not failed', async () => {
				const uploadItems = populateUploadItems(3);
				forEach(uploadItems, (item) => {
					item.status = UploadStatus.FAILED;
					item.parentNodeId = ROOTS.LOCAL_ROOT;
				});
				uploadItems[0].status = UploadStatus.COMPLETED;
				const uploadMap = keyBy(uploadItems, 'id');

				uploadVar(uploadMap);
				const localRoot = populateLocalRoot();

				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [localRoot] })
					}
				} satisfies Partial<Resolvers>;
				const { user, getByRoleWithIcon, queryByRoleWithIcon } = setup(<UploadList />, { mocks });

				expect(screen.getByText(uploadItems[0].name)).toBeVisible();
				expect(screen.getAllByTestId(ICON_REGEXP.uploadFailed)).toHaveLength(
					uploadItems.length - 1
				);
				await selectNodes(Object.keys(uploadMap), user);
				expect(screen.getByText(/deselect all/i)).toBeVisible();
				expect(
					queryByRoleWithIcon('button', { icon: ICON_REGEXP.moreVertical })
				).not.toBeInTheDocument();
				expect(getByRoleWithIcon('button', { icon: ICON_REGEXP.goToFolder })).toBeVisible();
				expect(
					queryByRoleWithIcon('button', { icon: ICON_REGEXP.retryUpload })
				).not.toBeInTheDocument();
			});

			test('Action on multiple selection reset all selected item status from failed to loading, restart upload and exit selection mode', async () => {
				const uploadedFiles = populateNodes(3, 'File');
				const localRoot = populateLocalRoot();
				forEach(uploadedFiles, (item) => {
					item.parent = localRoot;
				});

				const uploadFailedHandler = jest.fn();
				const uploadSuccessHandler = jest.fn();
				const emitter = new EventEmitter();

				server.use(
					http.post<UploadRequestParams, UploadRequestBody, UploadResponse | Record<string, never>>(
						`${REST_ENDPOINT}${UPLOAD_PATH}`,
						() =>
							Promise.any([
								delayUntil(emitter, EMITTER_CODES.fail).then(() => {
									uploadFailedHandler();
									return HttpResponse.json<Record<string, never>>({}, { status: 500 });
								}),
								delayUntil(emitter, EMITTER_CODES.success).then(() => {
									uploadSuccessHandler();
									return HttpResponse.json<UploadResponse>({
										nodeId: faker.string.uuid()
									});
								})
							])
					)
				);

				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [localRoot, ...uploadedFiles] })
					}
				} satisfies Partial<Resolvers>;

				const dataTransferObj = createUploadDataTransfer(uploadedFiles);

				const { user, getByRoleWithIcon, queryByRoleWithIcon } = setup(<UploadList />, {
					mocks
				});

				const dropzoneArea = await screen.findByText(/nothing here/i);

				await uploadWithDnD(dropzoneArea, dataTransferObj);

				expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
					uploadedFiles.length
				);
				expect(screen.queryByText(/Drop here your attachments/m)).not.toBeInTheDocument();

				emitter.emit(EMITTER_CODES.fail);

				await screen.findAllByTestId(ICON_REGEXP.uploadFailed);
				expect(screen.getAllByTestId(ICON_REGEXP.uploadFailed)).toHaveLength(uploadedFiles.length);
				const uploadItems = Object.keys(uploadVar());
				await selectNodes(uploadItems, user);
				const retryAllAction = getByRoleWithIcon('button', { icon: ICON_REGEXP.retryUpload });
				expect(retryAllAction).toBeVisible();
				await user.click(retryAllAction);
				await screen.findAllByTestId(ICON_REGEXP.uploadLoading);
				expect(screen.getAllByTestId(ICON_REGEXP.uploadLoading)).toHaveLength(uploadedFiles.length);
				expect(screen.queryByText(/select all/i)).not.toBeInTheDocument();
				expect(
					queryByRoleWithIcon('button', { icon: ICON_REGEXP.retryUpload })
				).not.toBeInTheDocument();
				emitter.emit(EMITTER_CODES.success);
				await waitFor(() =>
					expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(
						uploadedFiles.length
					)
				);
				expect(screen.queryByTestId(ICON_REGEXP.uploadFailed)).not.toBeInTheDocument();
			});
		});

		describe('On a folder', () => {
			test('If the folder is not created, retry the creation of the folder and then starts the upload of the children', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				folder.parent = localRoot;
				const children = populateNodes(2, 'File');
				folder.children.nodes = children;
				forEach(children, (child) => {
					child.parent = folder;
				});

				const dataTransferObj = createUploadDataTransfer([folder]);

				const uploadHandler = jest.fn(handleUploadFileRequest);

				server.use(
					graphql.mutation(
						CreateFolderDocument,
						() =>
							HttpResponse.json({
								errors: [
									new ApolloError({ graphQLErrors: [generateError('create folder msw error')] })
								]
							}),
						{ once: true }
					),
					http.post(`${REST_ENDPOINT}${UPLOAD_PATH}`, uploadHandler)
				);

				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [localRoot] })
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<UploadList />, { mocks });

				const dropzone = await screen.findByText(/nothing here/i);
				await uploadWithDnD(dropzone, dataTransferObj);
				await screen.findByText(folder.name);
				expect(screen.getByText(folder.name)).toBeVisible();
				await screen.findByTestId(ICON_REGEXP.uploadFailed);
				await user.hover(screen.getByText(folder.name));
				expect(screen.getByTestId(ICON_REGEXP.retryUpload)).toBeInTheDocument();
				expect(uploadHandler).not.toHaveBeenCalled();
				await user.click(screen.getByTestId(ICON_REGEXP.retryUpload));
				await screen.findByTestId(ICON_REGEXP.uploadCompleted);
				expect(uploadHandler).toHaveBeenCalledTimes(children.length);
			});

			test('[one nested level] If the folder is already created, it does not create the folder again and retries the upload of the only children which are failed', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				folder.parent = localRoot;
				const children = populateNodes(5, 'File');
				folder.children.nodes = children;
				forEach(children, (child) => {
					child.parent = folder;
				});

				const dataTransferObj = createUploadDataTransfer([folder]);

				const uploadHandler = jest.fn();
				const createFolderMutation = jest.fn();

				server.use(
					graphql.mutation<CreateFolderMutation, CreateFolderMutationVariables>(
						CreateFolderDocument,
						() => {
							createFolderMutation();
							return HttpResponse.json({
								data: { createFolder: { ...folder, children: populateNodePage([]) } as Folder }
							});
						}
					),
					http.post<UploadRequestParams, UploadRequestBody, UploadResponse | Record<string, never>>(
						`${REST_ENDPOINT}${UPLOAD_PATH}`,
						({ request }) => {
							uploadHandler();
							const fileName =
								request.headers.get('filename') &&
								window.atob(request.headers.get('filename') as string);
							if (fileName === children[1].name || fileName === children[3].name) {
								return HttpResponse.json({}, { status: 500 });
							}
							return HttpResponse.json({ nodeId: faker.string.uuid() });
						}
					)
				);

				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [localRoot] })
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<UploadList />, { mocks });

				const dropzone = await screen.findByText(/nothing here/i);
				await uploadWithDnD(dropzone, dataTransferObj);
				await screen.findByText(folder.name);
				expect(screen.getByText(folder.name)).toBeVisible();
				await screen.findByTestId(ICON_REGEXP.uploadFailed);
				await user.hover(screen.getByText(folder.name));
				expect(screen.getByTestId(ICON_REGEXP.retryUpload)).toBeInTheDocument();
				expect(createFolderMutation).toHaveBeenCalledTimes(1);
				expect(uploadHandler).toHaveBeenCalledTimes(children.length);
				expect(screen.getByText(/4\/6/)).toBeVisible();
				uploadHandler.mockClear();
				await user.click(screen.getByTestId(ICON_REGEXP.retryUpload));
				await screen.findByTestId(ICON_REGEXP.uploadFailed);
				expect(createFolderMutation).toHaveBeenCalledTimes(1);
				expect(uploadHandler).toHaveBeenCalledTimes(2);
				expect(screen.getByText(/4\/6/)).toBeVisible();
			});

			test('[two nested levels] If a sub-folder fail, retry on the folder retries the sub-folder and all its content', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				folder.parent = localRoot;
				const children = populateNodes(2, 'File');
				const subFolder = populateFolder();
				subFolder.children = populateNodePage(populateNodes(3, 'File'));
				forEach(subFolder.children.nodes, (child) => {
					if (child) {
						child.parent = subFolder;
					}
				});
				children.push(subFolder);
				folder.children.nodes = children;
				forEach(children, (child) => {
					child.parent = folder;
				});

				const dataTransferObj = createUploadDataTransfer([folder]);

				const uploadHandler = jest.fn(handleUploadFileRequest);

				let createSubFolderCalled = false;

				server.use(
					graphql.mutation<CreateFolderMutation, CreateFolderMutationVariables>(
						CreateFolderDocument,
						({ variables }) => {
							if (variables.name === subFolder.name) {
								if (!createSubFolderCalled) {
									createSubFolderCalled = true;
									return HttpResponse.json({
										errors: [
											new ApolloError({ graphQLErrors: [generateError('create folder msw error')] })
										]
									});
								}
								HttpResponse.json({
									data: {
										createFolder: {
											...subFolder,
											children: populateNodePage([]),
											parent: { ...folder, children: populateNodePage([]) }
										} as Folder
									}
								});
							}

							return HttpResponse.json({
								data: { createFolder: { ...folder, children: populateNodePage([]) } as Folder }
							});
						}
					),
					http.post<UploadRequestParams, UploadRequestBody, UploadResponse>(
						`${REST_ENDPOINT}${UPLOAD_PATH}`,
						uploadHandler
					)
				);

				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [localRoot] })
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<UploadList />, { mocks });

				const dropzone = await screen.findByText(/nothing here/i);
				await uploadWithDnD(dropzone, dataTransferObj);
				await screen.findByText(folder.name);
				expect(screen.getByText(folder.name)).toBeVisible();
				await screen.findByTestId(ICON_REGEXP.uploadFailed);
				expect(screen.getByText(/3\/7/)).toBeVisible();
				// upload has been called only for direct children of main folder
				expect(uploadHandler).toHaveBeenCalledTimes(2);
				await user.hover(screen.getByText(folder.name));
				expect(screen.getByTestId(ICON_REGEXP.retryUpload)).toBeInTheDocument();
				await user.click(screen.getByTestId(ICON_REGEXP.retryUpload));
				await screen.findByTestId(ICON_REGEXP.uploadCompleted);
				// upload has been called for all files (main folder children and sub-folder children)
				expect(uploadHandler).toHaveBeenCalledTimes(5);
				expect(screen.getByText(/7\/7/)).toBeVisible();
			});

			test('[two nested levels] If some files inside a sub-folder fail, retry on the folder retries only the upload of the failed files', async () => {
				const localRoot = populateLocalRoot();
				const folder = populateFolder();
				folder.parent = localRoot;
				const children = populateNodes(5, 'File');
				const subFolder = populateFolder();
				const subFolderChildren = populateNodes(3, 'File');
				subFolder.children = populateNodePage(subFolderChildren);
				forEach(subFolder.children.nodes, (child) => {
					if (child) {
						child.parent = subFolder;
					}
				});
				children.push(subFolder);
				folder.children.nodes = children;
				forEach(children, (child) => {
					child.parent = folder;
				});

				const dataTransferObj = createUploadDataTransfer([folder]);

				const uploadHandler = jest.fn();
				let uploadFailedCalled = false;

				server.use(
					http.post<UploadRequestParams, UploadRequestBody, UploadResponse | Record<string, never>>(
						`${REST_ENDPOINT}${UPLOAD_PATH}`,
						({ request }) => {
							uploadHandler();
							const fileName =
								request.headers.get('filename') &&
								window.atob(request.headers.get('filename') as string);
							if (!uploadFailedCalled && fileName === subFolderChildren[1].name) {
								uploadFailedCalled = true;
								return HttpResponse.json({}, { status: 500 });
							}
							return HttpResponse.json({ nodeId: faker.string.uuid() });
						}
					)
				);

				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [localRoot] })
					}
				} satisfies Partial<Resolvers>;

				const { user } = setup(<UploadList />, { mocks });

				const dropzone = await screen.findByText(/nothing here/i);
				await uploadWithDnD(dropzone, dataTransferObj);
				await screen.findByText(folder.name);
				expect(screen.getByText(folder.name)).toBeVisible();
				await screen.findByTestId(ICON_REGEXP.uploadFailed);
				expect(screen.getByText(/9\/10/)).toBeVisible();
				await user.hover(screen.getByText(folder.name));
				expect(screen.getByTestId(ICON_REGEXP.retryUpload)).toBeInTheDocument();
				expect(uploadHandler).toHaveBeenCalledTimes(children.length + subFolderChildren.length - 1);
				uploadHandler.mockReset();
				await user.click(screen.getByTestId(ICON_REGEXP.retryUpload));
				await screen.findByTestId(ICON_REGEXP.uploadCompleted);
				expect(uploadHandler).toHaveBeenCalledTimes(1);
				expect(screen.getByText(/10\/10/)).toBeVisible();
			});
		});
	});
});
