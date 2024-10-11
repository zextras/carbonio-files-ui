/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { waitFor } from '@testing-library/react';
import { keyBy } from 'lodash';
import { http, HttpResponse } from 'msw';

import UploadView from './UploadView';
import { ACTION_IDS } from '../../constants';
import { NewAction } from '../../hooks/useCreateOptions';
import server from '../../mocks/server';
import { uploadVar } from '../apollo/uploadVar';
import {
	DOCS_SERVICE_NAME,
	HEALTH_PATH,
	NODES_LOAD_LIMIT,
	NODES_SORT_DEFAULT,
	REST_ENDPOINT
} from '../constants';
import { DISPLAYER_EMPTY_MESSAGE, ICON_REGEXP, SELECTORS } from '../constants/test';
import { healthCache } from '../hooks/useHealthInfo';
import { HealthResponse } from '../mocks/handleHealthRequest';
import {
	populateFile,
	populateFolder,
	populateLocalRoot,
	populateNodes,
	populateUploadItems
} from '../mocks/mockUtils';
import {
	createUploadDataTransfer,
	setup,
	uploadWithDnD,
	screen,
	within,
	spyOnUseCreateOptions
} from '../tests/utils';
import { UploadStatus } from '../types/graphql/client-types';
import { Resolvers } from '../types/graphql/resolvers-types';
import { Folder, GetChildrenDocument } from '../types/graphql/types';
import { mockGetNode } from '../utils/resolverMocks';
import { inputElement } from '../utils/utils';

describe('Upload view', () => {
	test('Click on an item open the displayer', async () => {
		const localRoot = populateLocalRoot();
		const node = populateFile();
		node.parent = localRoot;

		const dataTransferObj = createUploadDataTransfer([node]);

		const mocks = {
			Query: {
				getNode: mockGetNode({ getBaseNode: [localRoot] })
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<UploadView />, { mocks });

		const dropzone = await screen.findByText(/nothing here/i);
		await screen.findByText(DISPLAYER_EMPTY_MESSAGE);

		await uploadWithDnD(dropzone, dataTransferObj);

		expect(screen.getByText(node.name)).toBeVisible();
		expect(screen.getByText(DISPLAYER_EMPTY_MESSAGE)).toBeVisible();

		await user.click(screen.getByText(node.name));
		await waitFor(() => expect(screen.getAllByText(node.name)).toHaveLength(2));
		expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.close })).toBeVisible();
		expect(screen.queryByText(DISPLAYER_EMPTY_MESSAGE)).not.toBeInTheDocument();
		await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.close }));
		await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
		expect(screen.getByText(node.name)).toBeVisible();
	});

	describe('Drag and drop', () => {
		test('When the first item uploaded is a folder, open displayer for this folder', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder(2);
			folder.parent = localRoot;
			const otherUploads = populateNodes(2);
			otherUploads.forEach((node) => {
				node.parent = localRoot;
			});

			const dataTransferObj = createUploadDataTransfer([folder, ...otherUploads]);

			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [localRoot] })
				}
			} satisfies Partial<Resolvers>;

			setup(<UploadView />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);
			await screen.findByText(DISPLAYER_EMPTY_MESSAGE);
			await uploadWithDnD(dropzone, dataTransferObj);
			await screen.findByText(otherUploads[0].name);
			// wait for the displayer to open
			expect(
				await within(screen.getByTestId(SELECTORS.displayer)).findByText(folder.name)
			).toBeVisible();
			// wait for every upload to complete
			await screen.findAllByTestId(ICON_REGEXP.uploadCompleted);
			expect(screen.getByText(/path/i)).toBeVisible();
			expect(screen.getByText(/content/i)).toBeVisible();
			expect(screen.getByText(folder.children.nodes[0]!.name)).toBeVisible();
			expect(screen.getByText(folder.children.nodes[1]!.name)).toBeVisible();
		});

		test('When the first item uploaded is a folder, but the upload list is not empty, does not open displayer', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder(2);
			folder.parent = localRoot;
			const otherUploads = populateNodes(2);
			otherUploads.forEach((node) => {
				node.parent = localRoot;
			});

			const uploadItemsInList = populateUploadItems(2, 'File');
			uploadItemsInList.forEach((item) => {
				item.status = UploadStatus.COMPLETED;
			});
			uploadVar(keyBy(uploadItemsInList, (uploadItem) => uploadItem.id));

			const dataTransferObj = createUploadDataTransfer([folder, ...otherUploads]);

			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [localRoot] })
				}
			} satisfies Partial<Resolvers>;

			setup(<UploadView />, { mocks });

			const dropzone = await screen.findByText(uploadItemsInList[1].name);
			await uploadWithDnD(dropzone, dataTransferObj);
			await screen.findByText(otherUploads[0].name);
			// wait for every upload to complete
			await waitFor(() =>
				expect(screen.getAllByTestId(ICON_REGEXP.uploadCompleted)).toHaveLength(5)
			);
			expect(
				within(screen.getByTestId(SELECTORS.displayer)).queryByText(folder.name)
			).not.toBeInTheDocument();
			expect(screen.queryByText(/path/i)).not.toBeInTheDocument();
			expect(screen.queryByText(/content/i)).not.toBeInTheDocument();
		});

		test('When the first item uploaded is a file and a folder is also uploaded, does not open displayer for this folder', async () => {
			const localRoot = populateLocalRoot();
			const folder = populateFolder(2);
			folder.parent = localRoot;
			const otherUploads = populateNodes(2, 'File');
			otherUploads.forEach((node) => {
				node.parent = localRoot;
			});

			const dataTransferObj = createUploadDataTransfer([...otherUploads, folder]);

			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [localRoot] })
				}
			} satisfies Partial<Resolvers>;

			setup(<UploadView />, { mocks });

			const dropzone = await screen.findByText(/nothing here/i);
			await uploadWithDnD(dropzone, dataTransferObj);
			await screen.findByText(otherUploads[0].name);
			// wait for every upload to complete
			await screen.findAllByTestId(ICON_REGEXP.uploadCompleted);
			expect(
				within(screen.getByTestId(SELECTORS.displayer)).queryByText(folder.name)
			).not.toBeInTheDocument();
			expect(screen.queryByText(/path/i)).not.toBeInTheDocument();
			expect(screen.queryByText(/content/i)).not.toBeInTheDocument();
		});
	});

	it('should show all actions disabled, except the upload', async () => {
		const actionIds = Object.values(ACTION_IDS);
		const actions = spyOnUseCreateOptions();
		setup(<UploadView />);
		await screen.findByText(/nothing here/i);
		await waitFor(() => {
			expect(actions).toHaveLength(actionIds.length);
		});
		actions.forEach((action) => {
			const actionIsDisabled = action.id !== ACTION_IDS.UPLOAD_FILE;
			expect((action.action(undefined) as NewAction).disabled).toBe(actionIsDisabled);
		});
	});

	it('should show snackbar on upload through new action', async () => {
		const options = spyOnUseCreateOptions();
		const file = new File(['(⌐□_□)'], 'a file');
		const { user } = setup(<UploadView />);
		await screen.findByText(/nothing here/i);
		const uploadAction = options.find((action) => action.id === ACTION_IDS.UPLOAD_FILE);
		uploadAction?.action('').execute(new KeyboardEvent(''));
		await user.upload(inputElement, file);
		expect(await screen.findByText(/Upload occurred in Files' Home/i)).toBeVisible();
	});

	it('should upload item inside local root', async () => {
		const localRoot = populateLocalRoot(0);
		apolloClient.cache.writeQuery({
			query: GetChildrenDocument,
			variables: {
				node_id: localRoot.id,
				children_limit: NODES_LOAD_LIMIT,
				sort: NODES_SORT_DEFAULT
			},
			data: {
				getNode: localRoot
			}
		});
		const options = spyOnUseCreateOptions();
		const file = new File(['(⌐□_□)'], 'a file');
		const mocks = {
			Query: {
				getNode: mockGetNode({ getBaseNode: [localRoot] })
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<UploadView />, { mocks });
		await screen.findByText(/nothing here/i);
		const uploadAction = options.find((action) => action.id === ACTION_IDS.UPLOAD_FILE);
		uploadAction?.action('').execute(new KeyboardEvent(''));
		await user.upload(inputElement, file);
		await waitFor(() => {
			const localRootData = apolloClient.cache.readQuery({
				query: GetChildrenDocument,
				variables: {
					node_id: localRoot.id,
					children_limit: NODES_LOAD_LIMIT,
					sort: NODES_SORT_DEFAULT
				}
			});
			return expect((localRootData?.getNode as Folder | null)?.children.nodes).toHaveLength(1);
		});
	});

	it('should show docs creation actions if docs is available', async () => {
		healthCache.reset();
		const createOptions = spyOnUseCreateOptions();
		server.use(
			http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
				HttpResponse.json({ dependencies: [{ name: DOCS_SERVICE_NAME, live: true }] })
			)
		);
		setup(<UploadView />);
		await waitFor(() => expect(healthCache.healthReceived).toBeTruthy());
		expect(createOptions).toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_DOCUMENT })
		);
		expect(createOptions).toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_SPREADSHEET })
		);
		expect(createOptions).toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_PRESENTATION })
		);
	});

	it('should not show docs creation actions if docs is not available', async () => {
		healthCache.reset();
		const createOptions = spyOnUseCreateOptions();
		server.use(
			http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
				HttpResponse.json({ dependencies: [{ name: DOCS_SERVICE_NAME, live: false }] })
			)
		);
		setup(<UploadView />);
		await waitFor(() => expect(healthCache.healthReceived).toBeTruthy());
		expect(createOptions).not.toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_DOCUMENT })
		);
		expect(createOptions).not.toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_SPREADSHEET })
		);
		expect(createOptions).not.toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_PRESENTATION })
		);
	});
});
