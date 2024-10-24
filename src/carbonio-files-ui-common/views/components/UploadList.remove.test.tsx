/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { ApolloError } from '@apollo/client';
import { faker } from '@faker-js/faker';
import { act, screen, waitFor } from '@testing-library/react';
import { EventEmitter } from 'events';
import { forEach, keyBy } from 'lodash';
import { graphql, http, HttpResponse, HttpResponseResolver, StrictResponse } from 'msw';

import { UploadList } from './UploadList';
import server from '../../../mocks/server';
import { uploadVar } from '../../apollo/uploadVar';
import { REST_ENDPOINT, ROOTS, UPLOAD_PATH } from '../../constants';
import { ACTION_REGEXP, EMITTER_CODES, ICON_REGEXP } from '../../constants/test';
import {
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
	Folder,
	GetChildQuery,
	GetChildQueryVariables,
	GetChildrenDocument,
	GetChildrenQuery,
	GetChildrenQueryVariables
} from '../../types/graphql/types';
import { getChildrenVariables, mockGetNode } from '../../utils/resolverMocks';

describe('Upload List', () => {
	describe('Remove', () => {
		describe('Selection Mode', () => {
			test('Action is visible even if selected items have all a different status', async () => {
				const uploadItems = populateUploadItems(Object.values(UploadStatus).length);
				forEach(Object.values(UploadStatus), (status, index) => {
					uploadItems[index].status = status;
					uploadItems[index].parentNodeId = ROOTS.LOCAL_ROOT;
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
				expect(screen.getByTestId(ICON_REGEXP.uploadCompleted)).toBeVisible();
				expect(screen.getByTestId(ICON_REGEXP.uploadFailed)).toBeVisible();
				expect(screen.getAllByTestId(ICON_REGEXP.uploadLoading)).toHaveLength(2);
				await selectNodes(Object.keys(uploadMap), user);
				expect(screen.getByText(/deselect all/i)).toBeVisible();
				expect(
					queryByRoleWithIcon('button', { icon: ICON_REGEXP.moreVertical })
				).not.toBeInTheDocument();
				expect(getByRoleWithIcon('button', { icon: ICON_REGEXP.removeUpload })).toBeVisible();
			});

			test('Action remove all items from the list, stop the upload of the items which are not completed and exit from selection mode', async () => {
				const localRoot = populateFolder(0, ROOTS.LOCAL_ROOT);

				// write local root data in cache as if it was already loaded
				global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
					query: GetChildrenDocument,
					variables: getChildrenVariables(localRoot.id),
					data: {
						getNode: localRoot
					}
				});

				const filesToUpload = populateNodes(6, 'File');

				forEach(filesToUpload, (file) => {
					file.parent = localRoot;
				});

				const dataTransferObj = createUploadDataTransfer(filesToUpload);

				const emitter = new EventEmitter();

				const handleUploadFileRequest: HttpResponseResolver<
					UploadRequestParams,
					UploadRequestBody,
					UploadResponse | null
				> = async ({ request }) => {
					const fileName =
						request.headers.get('filename') &&
						window.atob(request.headers.get('filename') as string);
					if (fileName === filesToUpload[0].name) {
						await delayUntil(emitter, EMITTER_CODES.fail);
						return HttpResponse.json(null, { status: 500 });
					}
					if (fileName === filesToUpload[1].name) {
						await delayUntil(emitter, EMITTER_CODES.success);
						return HttpResponse.json({ nodeId: filesToUpload[1].id });
					}
					await delayUntil(emitter, EMITTER_CODES.never);
					return new Response(null, { status: XMLHttpRequest.UNSENT }) as StrictResponse<null>;
				};

				const uploadFileHandler = jest.fn(handleUploadFileRequest);
				server.use(
					http.post(`${REST_ENDPOINT}${UPLOAD_PATH}`, uploadFileHandler),
					graphql.query<GetChildQuery, GetChildQueryVariables>('getChild', () =>
						HttpResponse.json({ data: { getNode: filesToUpload[1] } })
					)
				);
				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [localRoot] })
					}
				} satisfies Partial<Resolvers>;

				const { user, getByRoleWithIcon, queryByRoleWithIcon } = setup(<UploadList />, { mocks });

				const dropzone = await screen.findByText(/nothing here/i);

				await uploadWithDnD(dropzone, dataTransferObj);

				await screen.findByText(filesToUpload[0].name);
				await waitFor(() => expect(uploadFileHandler).toHaveBeenCalledTimes(3));

				expect(screen.getAllByTestId(ICON_REGEXP.uploadLoading)).toHaveLength(6);

				emitter.emit(EMITTER_CODES.fail);

				await waitFor(() => expect(uploadFileHandler).toHaveBeenCalledTimes(4));

				expect(screen.getAllByTestId(ICON_REGEXP.uploadLoading)).toHaveLength(5);
				expect(screen.getByTestId(ICON_REGEXP.uploadFailed)).toBeInTheDocument();

				emitter.emit(EMITTER_CODES.success);

				await waitFor(() => expect(uploadFileHandler).toHaveBeenCalledTimes(5));

				expect(screen.getAllByTestId(ICON_REGEXP.uploadLoading)).toHaveLength(4);
				expect(screen.getByTestId(ICON_REGEXP.uploadFailed)).toBeInTheDocument();
				expect(screen.getByTestId(ICON_REGEXP.uploadCompleted)).toBeInTheDocument();

				await selectNodes(Object.keys(uploadVar()), user);
				expect(screen.getByText(/deselect all/i)).toBeVisible();
				const removeAction = getByRoleWithIcon('button', { icon: ICON_REGEXP.removeUpload });
				expect(removeAction).toBeVisible();

				await user.click(removeAction);
				expect(screen.queryByText(filesToUpload[0].name)).not.toBeInTheDocument();
				expect(screen.queryByText(filesToUpload[1].name)).not.toBeInTheDocument();
				expect(screen.queryByText(filesToUpload[2].name)).not.toBeInTheDocument();
				expect(screen.queryByText(filesToUpload[3].name)).not.toBeInTheDocument();
				expect(screen.queryByText(filesToUpload[4].name)).not.toBeInTheDocument();
				expect(screen.queryByText(filesToUpload[5].name)).not.toBeInTheDocument();

				expect(screen.getByText(/nothing here/i)).toBeVisible();
				expect(screen.queryByText(/select all/i)).not.toBeInTheDocument();
				expect(
					queryByRoleWithIcon('button', { icon: ICON_REGEXP.removeUpload })
				).not.toBeInTheDocument();

				const localRootCachedData = global.apolloClient.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GetChildrenDocument,
					variables: getChildrenVariables(localRoot.id)
				});

				expect((localRootCachedData?.getNode as Folder).children?.nodes).toHaveLength(1);
				expect((localRootCachedData?.getNode as Folder).children?.nodes[0]?.name).toBe(
					filesToUpload[1].name
				);

				act(() => {
					emitter.emit(EMITTER_CODES.never);
				});
			});

			describe('On a folder', () => {
				test('If the folder is queued, remove the folder and all its content and does not upload anything', async () => {
					const localRoot = populateLocalRoot();
					const folder = populateFolder();
					folder.parent = localRoot;
					const children = populateNodes(2, 'File');
					folder.children = populateNodePage(children);
					children.forEach((child) => {
						child.parent = folder;
					});
					const otherItems = populateNodes(3, 'File');

					const itemsToUpload = [...otherItems, folder];

					const dataTransferObj = createUploadDataTransfer(itemsToUpload);

					// write local root data in cache as if it was already loaded
					global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
						query: GetChildrenDocument,
						variables: getChildrenVariables(localRoot.id),
						data: {
							getNode: localRoot
						}
					});

					const mocks = {
						Query: {
							getNode: mockGetNode({ getBaseNode: [localRoot] })
						}
					} satisfies Partial<Resolvers>;

					const emitter = new EventEmitter();

					server.use(
						http.post<UploadRequestParams, UploadRequestBody, UploadResponse | null>(
							`${REST_ENDPOINT}${UPLOAD_PATH}`,
							async () => {
								await delayUntil(emitter, EMITTER_CODES.never);
								return HttpResponse.json(null, { status: 500 });
							}
						)
					);

					const { user } = setup(<UploadList />, { mocks });

					const dropzone = await screen.findByText(/nothing here/i);
					await uploadWithDnD(dropzone, dataTransferObj);
					await screen.findByText(folder.name);

					expect(screen.getByText(/queued/i)).toBeVisible();
					await user.rightClick(screen.getByText(folder.name));
					const removeAction = await screen.findByText(ACTION_REGEXP.removeUpload);
					await user.click(removeAction);
					expect(screen.queryByText(/queued/i)).not.toBeInTheDocument();
					expect(screen.queryByText(folder.name)).not.toBeInTheDocument();

					const localRootCachedData = global.apolloClient.readQuery<
						GetChildrenQuery,
						GetChildrenQueryVariables
					>({
						query: GetChildrenDocument,
						variables: getChildrenVariables(localRoot.id)
					});

					expect((localRootCachedData?.getNode as Folder).children?.nodes).toHaveLength(0);

					act(() => {
						emitter.emit(EMITTER_CODES.never);
					});
				});

				test('If the folder is loading, and it is already created, blocks the upload of items loading, remove all items from the upload, but does not delete the already uploaded items', async () => {
					const localRoot = populateLocalRoot();
					const folder = populateFolder();
					folder.parent = localRoot;
					const children = populateNodes(3, 'File');
					folder.children = populateNodePage(children);
					children.forEach((child) => {
						child.parent = folder;
					});

					const dataTransferObj = createUploadDataTransfer([folder]);

					// write local root data in cache as if it was already loaded
					global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
						query: GetChildrenDocument,
						variables: getChildrenVariables(localRoot.id),
						data: {
							getNode: localRoot
						}
					});

					const mocks = {
						Query: {
							getNode: mockGetNode({ getBaseNode: [localRoot] })
						}
					} satisfies Partial<Resolvers>;

					const emitter = new EventEmitter();

					const uploadHandlerResolve = jest.fn();

					server.use(
						http.post<UploadRequestParams, UploadRequestBody, UploadResponse | null>(
							`${REST_ENDPOINT}${UPLOAD_PATH}`,
							async () => {
								await delayUntil(emitter, EMITTER_CODES.never);
								uploadHandlerResolve();
								return new Response(null, {
									status: XMLHttpRequest.UNSENT
								}) as StrictResponse<null>;
							}
						)
					);

					const { user } = setup(<UploadList />, { mocks });

					const dropzone = await screen.findByText(/nothing here/i);
					await uploadWithDnD(dropzone, dataTransferObj);
					await screen.findByText(folder.name);

					// wait creation of the folder
					await screen.findByText(/1\/4/);

					await user.rightClick(screen.getByText(folder.name));
					const removeAction = await screen.findByText(ACTION_REGEXP.removeUpload);
					await user.click(removeAction);
					expect(screen.queryByText(folder.name)).not.toBeInTheDocument();
					expect(uploadHandlerResolve).not.toHaveBeenCalled();

					const localRootCachedData = global.apolloClient.readQuery<
						GetChildrenQuery,
						GetChildrenQueryVariables
					>({
						query: GetChildrenDocument,
						variables: getChildrenVariables(localRoot.id)
					});

					expect((localRootCachedData?.getNode as Folder).children?.nodes).toHaveLength(1);
					expect((localRootCachedData?.getNode as Folder).children?.nodes[0]?.name).toBe(
						folder.name
					);

					act(() => {
						emitter.emit(EMITTER_CODES.never);
					});
				});

				test('If the folder is failed, and all its content is failed, remove the folder and all its content and does not upload anything', async () => {
					const localRoot = populateLocalRoot();
					const folder = populateFolder();
					folder.parent = localRoot;
					const children = populateNodes(2, 'File');
					folder.children = populateNodePage(children);
					children.forEach((child) => {
						child.parent = folder;
					});

					const dataTransferObj = createUploadDataTransfer([folder]);

					// write local root data in cache as if it was already loaded
					global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
						query: GetChildrenDocument,
						variables: getChildrenVariables(localRoot.id),
						data: {
							getNode: localRoot
						}
					});

					const mocks = {
						Query: {
							getNode: mockGetNode({ getBaseNode: [localRoot] })
						}
					} satisfies Partial<Resolvers>;

					const uploadHandler = jest.fn();

					server.use(
						graphql.mutation<CreateFolderMutation, CreateFolderMutationVariables>(
							CreateFolderDocument,
							() =>
								HttpResponse.json({
									errors: [
										new ApolloError({ graphQLErrors: [generateError('create folder msw error')] })
									]
								})
						),
						http.post<UploadRequestParams, UploadRequestBody, UploadResponse>(
							`${REST_ENDPOINT}${UPLOAD_PATH}`,
							async () => {
								uploadHandler();
								return HttpResponse.json({ nodeId: faker.string.uuid() });
							}
						)
					);

					const { user } = setup(<UploadList />, { mocks });

					const dropzone = await screen.findByText(/nothing here/i);
					await uploadWithDnD(dropzone, dataTransferObj);
					await screen.findByText(folder.name);

					await screen.findByTestId(ICON_REGEXP.uploadFailed);
					expect(screen.getByText(/0\/3/)).toBeVisible();
					await user.rightClick(screen.getByText(folder.name));
					const removeAction = await screen.findByText(ACTION_REGEXP.removeUpload);
					await user.click(removeAction);
					expect(screen.queryByText(folder.name)).not.toBeInTheDocument();
					expect(uploadHandler).not.toHaveBeenCalled();

					const localRootCachedData = global.apolloClient.readQuery<
						GetChildrenQuery,
						GetChildrenQueryVariables
					>({
						query: GetChildrenDocument,
						variables: getChildrenVariables(localRoot.id)
					});

					expect((localRootCachedData?.getNode as Folder).children?.nodes).toHaveLength(0);
				});

				test('If the folder is completed, remove the folder and its content from the upload, but does not delete the uploaded items', async () => {
					const localRoot = populateLocalRoot();
					const folder = populateFolder();
					folder.parent = localRoot;
					const children = populateNodes(3, 'File');
					folder.children = populateNodePage(children);
					children.forEach((child) => {
						child.parent = folder;
					});

					const dataTransferObj = createUploadDataTransfer([folder]);

					// write local root data in cache as if it was already loaded
					global.apolloClient.cache.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
						query: GetChildrenDocument,
						variables: getChildrenVariables(localRoot.id),
						data: {
							getNode: localRoot
						}
					});

					const mocks = {
						Query: {
							getNode: mockGetNode({ getBaseNode: [localRoot] })
						}
					} satisfies Partial<Resolvers>;

					const uploadHandler = jest.fn();

					server.use(
						http.post<UploadRequestParams, UploadRequestBody, UploadResponse>(
							`${REST_ENDPOINT}${UPLOAD_PATH}`,
							async () => {
								uploadHandler();
								return HttpResponse.json({ nodeId: faker.string.uuid() });
							}
						)
					);

					const { user } = setup(<UploadList />, { mocks });

					const dropzone = await screen.findByText(/nothing here/i);
					await uploadWithDnD(dropzone, dataTransferObj);
					await screen.findByText(folder.name);

					await screen.findByTestId(ICON_REGEXP.uploadCompleted);
					expect(screen.getByText(/4\/4/)).toBeVisible();

					await user.rightClick(screen.getByText(folder.name));
					const removeAction = await screen.findByText(ACTION_REGEXP.removeUpload);
					await user.click(removeAction);
					expect(screen.queryByText(folder.name)).not.toBeInTheDocument();
					expect(uploadHandler).toHaveBeenCalledTimes(3);

					const localRootCachedData = global.apolloClient.readQuery<
						GetChildrenQuery,
						GetChildrenQueryVariables
					>({
						query: GetChildrenDocument,
						variables: getChildrenVariables(localRoot.id)
					});

					expect((localRootCachedData?.getNode as Folder).children?.nodes).toHaveLength(1);
					expect((localRootCachedData?.getNode as Folder).children?.nodes[0]?.name).toBe(
						folder.name
					);
				});
			});
		});
	});
});
