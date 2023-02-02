/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';

import { UseNavigationHook } from '../../../hooks/useNavigation';
import { ICON_REGEXP } from '../../constants/test';
import { UseUploadHook } from '../../hooks/useUpload';
import {
	populateFolder,
	populateUploadFolderItem,
	populateUploadItem
} from '../../mocks/mockUtils';
import { UploadStatus } from '../../types/graphql/client-types';
import { mockGetBaseNode } from '../../utils/mockUtils';
import { buildBreadCrumbRegExp, setup } from '../../utils/testUtils';
import { humanFileSize } from '../../utils/utils';
import { UploadListItemWrapper } from './UploadListItemWrapper';

const mockedUseUploadHook: ReturnType<UseUploadHook> = {
	add: jest.fn(),
	update: jest.fn(),
	removeById: jest.fn(),
	removeByNodeId: jest.fn(),
	removeAllCompleted: jest.fn(),
	retryById: jest.fn()
};

const mockedUseNavigationHook: ReturnType<UseNavigationHook> = {
	navigateTo: jest.fn(),
	navigateToFolder: jest.fn(),
	navigateBack: jest.fn
};

jest.mock('../../hooks/useUpload', () => ({
	useUpload: (): ReturnType<UseUploadHook> => mockedUseUploadHook
}));

jest.mock('../../../hooks/useNavigation', () => ({
	useNavigation: (): ReturnType<UseNavigationHook> => mockedUseNavigationHook
}));

describe('Upload List Item Wrapper', () => {
	test('File name, destination folder, progress and size are visible', async () => {
		const destinationFolder = populateFolder();
		const file = populateUploadItem({
			progress: 20,
			parentId: destinationFolder.id,
			status: UploadStatus.LOADING,
			parentNodeId: destinationFolder.id
		});
		const mockSelectId = jest.fn();

		const mocks = [mockGetBaseNode({ node_id: destinationFolder.id }, destinationFolder)];

		const { findByTextWithMarkup } = setup(
			<UploadListItemWrapper
				node={file}
				isSelected={false}
				isSelectionModeActive={false}
				selectId={mockSelectId}
			/>,
			{ mocks }
		);

		expect(screen.getByText(file.name)).toBeVisible();
		const destinationFolderItem = await findByTextWithMarkup(
			buildBreadCrumbRegExp(destinationFolder.name)
		);
		expect(destinationFolderItem).toBeVisible();
		if (file.file) {
			expect(screen.getByText(humanFileSize(file.file.size))).toBeVisible();
		}
		expect(screen.getByText(new RegExp(`${file.progress}\\s*%`, 'm'))).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();
	});

	test('If item is queued, queued label is shown instead of the progress', async () => {
		const file = populateUploadItem({ status: UploadStatus.QUEUED });
		const mockSelectId = jest.fn();

		setup(
			<UploadListItemWrapper
				node={file}
				isSelected={false}
				isSelectionModeActive={false}
				selectId={mockSelectId}
			/>,
			{ mocks: [] }
		);

		expect(screen.getByText(/queued/i)).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.uploadLoading)).toBeVisible();
		expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument();
	});

	test('Progress for files is shown with the percentage', async () => {
		const uploadItem = populateUploadItem({ progress: 45, status: UploadStatus.LOADING });

		const selectFn = jest.fn();
		setup(
			<UploadListItemWrapper
				node={uploadItem}
				isSelected={false}
				isSelectionModeActive={false}
				selectId={selectFn}
			/>,
			{ mocks: [] }
		);

		expect(screen.getByText(/45\s*%/)).toBeVisible();
	});

	test('Progress for folders is shown as the fraction of loaded items on the total content count. The folder itself is included in the fraction values', async () => {
		const uploadItem = populateUploadFolderItem({
			failedCount: 2,
			progress: 3,
			contentCount: 10,
			status: UploadStatus.LOADING
		});

		const selectFn = jest.fn();
		setup(
			<UploadListItemWrapper
				node={uploadItem}
				isSelected={false}
				isSelectionModeActive={false}
				selectId={selectFn}
			/>,
			{ mocks: [] }
		);

		expect(screen.getByText(/3\/10/)).toBeVisible();
	});
});
