/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { keyBy } from 'lodash';

import { UploadDisplayerNode } from './UploadDisplayerNode';
import { uploadVar } from '../../apollo/uploadVar';
import { ICON_REGEXP, SELECTORS } from '../../constants/test';
import {
	populateFolder,
	populateUploadFolderItem,
	populateUploadItem,
	populateUploadItems
} from '../../mocks/mockUtils';
import { setup, screen, within } from '../../tests/utils';
import { UploadStatus } from '../../types/graphql/client-types';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { mockGetNode } from '../../utils/resolverMocks';
import { humanFileSize } from '../../utils/utils';

describe('Upload Displayer Node', () => {
	describe('Header actions', () => {
		test('Go to folder is visible for loading status', async () => {
			const parentFolder = populateFolder();
			const uploadItem = populateUploadItem({
				status: UploadStatus.LOADING,
				parentNodeId: parentFolder.id
			});
			uploadVar({ [uploadItem.id]: uploadItem });

			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [parentFolder] })
				}
			} satisfies Partial<Resolvers>;

			setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
				mocks
			});

			await screen.findByText(parentFolder.name);
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.goToFolder })).toBeVisible();
		});

		test('Go to folder is visible for completed status', async () => {
			const parentFolder = populateFolder();
			const uploadItem = populateUploadItem({
				status: UploadStatus.COMPLETED,
				parentNodeId: parentFolder.id
			});
			uploadVar({ [uploadItem.id]: uploadItem });

			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [parentFolder] })
				}
			} satisfies Partial<Resolvers>;

			setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
				mocks
			});

			await screen.findByText(parentFolder.name);
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.goToFolder })).toBeVisible();
		});

		test('Go to folder is visible for queued status', async () => {
			const parentFolder = populateFolder();
			const uploadItem = populateUploadItem({
				status: UploadStatus.QUEUED,
				parentNodeId: parentFolder.id
			});
			uploadVar({ [uploadItem.id]: uploadItem });

			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [parentFolder] })
				}
			} satisfies Partial<Resolvers>;

			setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
				mocks
			});

			await screen.findByText(parentFolder.name);
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.goToFolder })).toBeVisible();
		});

		test('Go to folder is visible for failed status', async () => {
			const parentFolder = populateFolder();
			const uploadItem = populateUploadItem({
				status: UploadStatus.FAILED,
				parentNodeId: parentFolder.id
			});
			uploadVar({ [uploadItem.id]: uploadItem });
			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [parentFolder] })
				}
			} satisfies Partial<Resolvers>;

			setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
				mocks
			});

			await screen.findByText(parentFolder.name);
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.goToFolder })).toBeVisible();
		});

		test('Retry is visible when item status is failed', async () => {
			const parentFolder = populateFolder();
			const uploadItem = populateUploadItem({
				status: UploadStatus.FAILED,
				parentNodeId: parentFolder.id
			});
			uploadVar({ [uploadItem.id]: uploadItem });
			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [parentFolder] })
				}
			} satisfies Partial<Resolvers>;

			setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
				mocks
			});

			await screen.findByText(parentFolder.name);
			expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.retryUpload })).toBeVisible();
		});

		test('Retry is hidden when item status is completed', async () => {
			const parentFolder = populateFolder();
			const uploadItem = populateUploadItem({
				status: UploadStatus.COMPLETED,
				parentNodeId: parentFolder.id
			});
			uploadVar({ [uploadItem.id]: uploadItem });
			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [parentFolder] })
				}
			} satisfies Partial<Resolvers>;

			setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
				mocks
			});

			await screen.findByText(parentFolder.name);
			expect(
				screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.retryUpload })
			).not.toBeInTheDocument();
		});

		test('Retry is hidden when item status is queued', async () => {
			const parentFolder = populateFolder();
			const uploadItem = populateUploadItem({
				status: UploadStatus.QUEUED,
				parentNodeId: parentFolder.id
			});
			uploadVar({ [uploadItem.id]: uploadItem });
			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [parentFolder] })
				}
			} satisfies Partial<Resolvers>;

			setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
				mocks
			});

			await screen.findByText(parentFolder.name);
			expect(
				screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.retryUpload })
			).not.toBeInTheDocument();
		});

		test('Retry is hidden when item status is loading', async () => {
			const parentFolder = populateFolder();
			const uploadItem = populateUploadItem({
				status: UploadStatus.LOADING,
				parentNodeId: parentFolder.id
			});
			uploadVar({ [uploadItem.id]: uploadItem });
			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [parentFolder] })
				}
			} satisfies Partial<Resolvers>;

			setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
				mocks
			});

			await screen.findByText(parentFolder.name);
			expect(
				screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.retryUpload })
			).not.toBeInTheDocument();
		});

		test('Retry for folder is visible when item status is failed because one of the items of the content is failed', async () => {
			const parentFolder = populateFolder();
			const children = populateUploadItems(2);
			children[0].status = UploadStatus.FAILED;
			const childrenMap = keyBy(children, (item) => item.id);
			const uploadItem = populateUploadFolderItem({
				children: Object.keys(childrenMap),
				status: UploadStatus.FAILED,
				nodeId: faker.string.uuid(),
				parentNodeId: parentFolder.id
			});
			children.forEach((child) => {
				child.parentNodeId = uploadItem.nodeId;
			});

			uploadVar({ [uploadItem.id]: uploadItem, ...childrenMap });
			const mocks = {
				Query: {
					getNode: mockGetNode({ getBaseNode: [parentFolder] })
				}
			} satisfies Partial<Resolvers>;
			setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
				mocks
			});

			await screen.findByText(parentFolder.name);
			expect(
				within(screen.getByTestId(SELECTORS.displayerActionsHeader)).getByRoleWithIcon('button', {
					icon: ICON_REGEXP.retryUpload
				})
			).toBeVisible();
		});
	});

	test('Size is visible for files', async () => {
		const uploadItem = populateUploadItem();
		uploadVar({ [uploadItem.id]: uploadItem });

		setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
			mocks: {}
		});

		expect(screen.getByText(/size/i)).toBeVisible();
		expect(screen.getByText(humanFileSize(uploadItem.file?.size || 0, undefined))).toBeVisible();
	});

	test('Size is hidden for folders', async () => {
		const uploadItem = populateUploadFolderItem();
		uploadVar({ [uploadItem.id]: uploadItem });

		setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
			mocks: {}
		});

		expect(screen.queryByText(/size/i)).not.toBeInTheDocument();
		expect(
			screen.queryByText(humanFileSize(uploadItem.file?.size || 0, undefined))
		).not.toBeInTheDocument();
	});

	test('Content is hidden for files', async () => {
		const uploadItem = populateUploadItem();
		uploadVar({ [uploadItem.id]: uploadItem });

		setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
			mocks: {}
		});

		expect(screen.queryByText(/content/i)).not.toBeInTheDocument();
	});

	test('Content is visible for folders', async () => {
		const children = populateUploadItems(2);
		const childrenMap = keyBy(children, (item) => item.id);
		const uploadItem = populateUploadFolderItem({ children: Object.keys(childrenMap) });

		uploadVar({ [uploadItem.id]: uploadItem, ...childrenMap });

		setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
			mocks: {}
		});

		expect(screen.getByText(/content/i)).toBeVisible();
		expect(screen.getByText(children[0].name)).toBeVisible();
		expect(screen.getByText(children[1].name)).toBeVisible();
	});

	test('Parent folder name is shown as partial path', async () => {
		const uploadItem = populateUploadItem({ fullPath: 'parent folder name/item' });
		uploadVar({ [uploadItem.id]: uploadItem });

		setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
			mocks: {}
		});

		expect(screen.getByText(/path/i)).toBeVisible();
		expect(screen.getByText(/parent folder name/i)).toBeVisible();
	});

	test('Item name is shown as partial path if item has no parent', async () => {
		const uploadItem = populateUploadItem({ fullPath: '/item name' });
		uploadVar({ [uploadItem.id]: uploadItem });

		setup(<UploadDisplayerNode uploadItem={uploadItem} />, {
			mocks: {}
		});

		expect(screen.getByText(/path/i)).toBeVisible();
		expect(screen.getByText(/item name/i)).toBeVisible();
	});
});
