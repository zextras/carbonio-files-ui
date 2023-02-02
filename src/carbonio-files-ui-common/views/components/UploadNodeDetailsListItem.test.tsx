/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { screen } from '@testing-library/react';

import { uploadVar } from '../../apollo/uploadVar';
import { ICON_REGEXP } from '../../constants/test';
import { populateUploadFolderItem, populateUploadItem } from '../../mocks/mockUtils';
import { UploadStatus } from '../../types/graphql/client-types';
import { buildBreadCrumbRegExp, setup } from '../../utils/testUtils';
import { UploadNodeDetailsListItem } from './UploadNodeDetailsListItem';

describe('Upload Node Details List Item', () => {
	test('The progress of the upload is visible if status is loading', async () => {
		const uploadItem = populateUploadItem({
			status: UploadStatus.LOADING,
			progress: 34,
			parentNodeId: faker.datatype.uuid()
		});

		uploadVar({ [uploadItem.id]: uploadItem });
		setup(<UploadNodeDetailsListItem id={uploadItem.id} />, { mocks: [] });

		await screen.findByText(uploadItem.name);
		expect(screen.getByText(`${uploadItem.progress}%`)).toBeVisible();
	});

	test('The progress of the upload is visible if status is completed', async () => {
		const uploadItem = populateUploadItem({
			status: UploadStatus.COMPLETED,
			progress: 34,
			parentNodeId: faker.datatype.uuid()
		});

		uploadVar({ [uploadItem.id]: uploadItem });
		setup(<UploadNodeDetailsListItem id={uploadItem.id} />, { mocks: [] });

		await screen.findByText(uploadItem.name);
		expect(screen.getByText(`${uploadItem.progress}%`)).toBeVisible();
	});

	test('The progress of the upload is visible if status is failed', async () => {
		const uploadItem = populateUploadItem({
			status: UploadStatus.FAILED,
			progress: 34,
			parentNodeId: faker.datatype.uuid()
		});

		uploadVar({ [uploadItem.id]: uploadItem });
		setup(<UploadNodeDetailsListItem id={uploadItem.id} />, { mocks: [] });

		await screen.findByText(uploadItem.name);
		expect(screen.getByText(`${uploadItem.progress}%`)).toBeVisible();
	});

	test('The progress of a folder is visible as counter of completed items on total items', async () => {
		const uploadItem = populateUploadFolderItem({
			status: UploadStatus.LOADING,
			progress: 7,
			contentCount: 20,
			failedCount: 3,
			parentNodeId: faker.datatype.uuid()
		});

		uploadVar({ [uploadItem.id]: uploadItem });
		setup(<UploadNodeDetailsListItem id={uploadItem.id} />, { mocks: [] });

		await screen.findByText(uploadItem.name);
		expect(screen.getByText(`${uploadItem.progress}/${uploadItem.contentCount}`)).toBeVisible();
		expect(screen.queryByText(`${uploadItem.failedCount}`)).not.toBeInTheDocument();
	});

	test('If the item is loading, the loading icon is shown', async () => {
		const uploadItem = populateUploadFolderItem({
			status: UploadStatus.LOADING
		});

		uploadVar({ [uploadItem.id]: uploadItem });
		setup(<UploadNodeDetailsListItem id={uploadItem.id} />, { mocks: [] });

		await screen.findByText(uploadItem.name);
		expect(screen.getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.uploadCompleted)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.uploadFailed)).not.toBeInTheDocument();
		expect(screen.queryByText(/queued/i)).not.toBeInTheDocument();
	});

	test('If the item is failed, the failed icon is shown', async () => {
		const uploadItem = populateUploadFolderItem({
			status: UploadStatus.FAILED
		});

		uploadVar({ [uploadItem.id]: uploadItem });
		setup(<UploadNodeDetailsListItem id={uploadItem.id} />, { mocks: [] });

		await screen.findByText(uploadItem.name);
		expect(screen.getByTestId(ICON_REGEXP.uploadFailed)).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.uploadCompleted)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.uploadLoading)).not.toBeInTheDocument();
		expect(screen.queryByText(/queued/i)).not.toBeInTheDocument();
	});

	test('If the item is completed, the completed icon is shown', async () => {
		const uploadItem = populateUploadFolderItem({
			status: UploadStatus.COMPLETED
		});

		uploadVar({ [uploadItem.id]: uploadItem });
		setup(<UploadNodeDetailsListItem id={uploadItem.id} />, { mocks: [] });

		await screen.findByText(uploadItem.name);
		expect(screen.getByTestId(ICON_REGEXP.uploadCompleted)).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.uploadFailed)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.uploadLoading)).not.toBeInTheDocument();
		expect(screen.queryByText(/queued/i)).not.toBeInTheDocument();
	});

	test('If the item is queued, the progress is hidden and the queued label is shown', async () => {
		const uploadItem = populateUploadItem({
			status: UploadStatus.QUEUED,
			progress: 34
		});

		uploadVar({ [uploadItem.id]: uploadItem });
		setup(<UploadNodeDetailsListItem id={uploadItem.id} />, { mocks: [] });

		await screen.findByText(uploadItem.name);
		expect(screen.getByText(/queued/i)).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();
		expect(screen.queryByTestId(ICON_REGEXP.uploadCompleted)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.uploadFailed)).not.toBeInTheDocument();
		expect(screen.queryByText('34%')).not.toBeInTheDocument();
	});

	test('The name of the item is visible', async () => {
		const uploadItem = populateUploadItem();

		uploadVar({ [uploadItem.id]: uploadItem });
		setup(<UploadNodeDetailsListItem id={uploadItem.id} />, { mocks: [] });

		await screen.findByText(uploadItem.name);
		expect(screen.getByText(uploadItem.name)).toBeVisible();
	});

	test('The path of the item is visible, starting from the root folder to the filename excluded', async () => {
		const path = ['path', 'to', 'a', 'sub-item.ext'];
		const uploadItem = populateUploadItem({ fullPath: path.join('/') });

		uploadVar({ [uploadItem.id]: uploadItem });
		const { getByTextWithMarkup } = setup(<UploadNodeDetailsListItem id={uploadItem.id} />, {
			mocks: []
		});

		await screen.findByText(uploadItem.name);
		expect(
			getByTextWithMarkup(buildBreadCrumbRegExp(...path.slice(0, path.length - 1)))
		).toBeVisible();
	});
});
