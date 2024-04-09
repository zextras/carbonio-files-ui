/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { waitFor } from '@testing-library/react';
import { keyBy } from 'lodash';

import UploadView from './UploadView';
import { ACTION_IDS } from '../../constants';
import * as useCreateOptionsModule from '../../hooks/useCreateOptions';
import { CreateOption } from '../../hooks/useCreateOptions';
import { uploadVar } from '../apollo/uploadVar';
import { NODES_LOAD_LIMIT, NODES_SORT_DEFAULT } from '../constants';
import { ICON_REGEXP, SELECTORS } from '../constants/test';
import {
	populateFile,
	populateFolder,
	populateLocalRoot,
	populateNodes,
	populateUploadItems
} from '../mocks/mockUtils';
import { Node } from '../types/common';
import { UploadStatus } from '../types/graphql/client-types';
import { Resolvers } from '../types/graphql/resolvers-types';
import { Folder, GetChildrenDocument } from '../types/graphql/types';
import { mockGetNode } from '../utils/resolverMocks';
import { createUploadDataTransfer, setup, uploadWithDnD, screen, within } from '../utils/testUtils';
import { inputElement } from '../utils/utils';

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions');

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
		await screen.findByText(/view files and folders/i);

		await uploadWithDnD(dropzone, dataTransferObj);

		expect(screen.getByText(node.name)).toBeVisible();
		expect(screen.getByText(/view files and folders/i)).toBeVisible();

		await user.click(screen.getByText(node.name));
		await waitFor(() => expect(screen.getAllByText(node.name)).toHaveLength(2));
		expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.close })).toBeVisible();
		expect(screen.queryByText(/view files and folders/i)).not.toBeInTheDocument();
		await user.click(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.close }));
		await screen.findByText(/view files and folders/i);
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
			expect(screen.getByText((folder.children.nodes[0] as Node).name)).toBeVisible();
			expect(screen.getByText((folder.children.nodes[1] as Node).name)).toBeVisible();
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
		const actions: CreateOption[] = [];
		jest.spyOn(useCreateOptionsModule, 'useCreateOptions').mockReturnValue({
			setCreateOptions: (...options): void => {
				actions.push(...options);
			},
			removeCreateOptions: (): void => undefined
		});

		setup(<UploadView />);
		await screen.findByText(/nothing here/i);
		expect(actions).toHaveLength(actionIds.length);
		actions.forEach((action) => {
			const actionIsDisabled = action.id !== ACTION_IDS.UPLOAD_FILE;
			expect(action.action(undefined).disabled).toBe(actionIsDisabled);
		});
	});

	it('should show snackbar on upload through new action', async () => {
		let uploadAction: CreateOption | undefined;
		jest.spyOn(useCreateOptionsModule, 'useCreateOptions').mockReturnValue({
			setCreateOptions: (...options): void => {
				uploadAction = options.find((action) => action.id === ACTION_IDS.UPLOAD_FILE);
			},
			removeCreateOptions: (): void => undefined
		});

		const file = new File(['(⌐□_□)'], 'a file');
		const { user } = setup(<UploadView />);
		await screen.findByText(/nothing here/i);
		uploadAction?.action('').onClick?.(new KeyboardEvent(''));
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
		let uploadAction: CreateOption | undefined;
		jest.spyOn(useCreateOptionsModule, 'useCreateOptions').mockReturnValue({
			setCreateOptions: (...options): void => {
				uploadAction = options.find((action) => action.id === ACTION_IDS.UPLOAD_FILE);
			},
			removeCreateOptions: (): void => undefined
		});

		const file = new File(['(⌐□_□)'], 'a file');
		const { user } = setup(<UploadView />);
		await screen.findByText(/nothing here/i);
		uploadAction?.action('').onClick?.(new KeyboardEvent(''));
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
			return expect((localRootData?.getNode as Folder).children.nodes).toHaveLength(1);
		});
	});
});
