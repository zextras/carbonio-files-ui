/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { fireEvent, screen } from '@testing-library/react';

import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateFolder, populateUploadItem } from '../../mocks/mockUtils';
import { UploadStatus } from '../../types/graphql/client-types';
import { mockGetBaseNode } from '../../utils/mockUtils';
import { setup } from '../../utils/testUtils';
import { UploadListItemWrapper } from './UploadListItemWrapper';

describe('Upload List Item Wrapper', () => {
	describe('Go to folder action', () => {
		describe('Contextual Menu', () => {
			test('Action is visible if parent is set', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: faker.helpers.objectValue(UploadStatus),
					parentNodeId: destinationFolder.id
				});
				const mockSelectId = jest.fn();

				const mocks = [mockGetBaseNode({ node_id: destinationFolder.id }, destinationFolder)];
				setup(
					<UploadListItemWrapper
						node={file}
						isSelected={false}
						isSelectionModeActive={false}
						selectId={mockSelectId}
					/>,
					{ mocks }
				);

				const item = screen.getByText(file.name);
				expect(item).toBeVisible();
				fireEvent.contextMenu(item);
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.getByText(ACTION_REGEXP.goToFolder)).toBeVisible();
			});

			test('Action is hidden if parent is not set', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: faker.helpers.objectValue(UploadStatus),
					parentNodeId: null
				});
				const mockSelectId = jest.fn();

				const mocks = [mockGetBaseNode({ node_id: destinationFolder.id }, destinationFolder)];
				setup(
					<UploadListItemWrapper
						node={file}
						isSelected={false}
						isSelectionModeActive={false}
						selectId={mockSelectId}
					/>,
					{ mocks }
				);

				const item = screen.getByText(file.name);
				expect(item).toBeVisible();
				fireEvent.contextMenu(item);
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.queryByText(ACTION_REGEXP.goToFolder)).not.toBeInTheDocument();
			});
		});

		describe('Hover bar', () => {
			test('Action is visible if parent is set', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: faker.helpers.objectValue(UploadStatus),
					parentNodeId: destinationFolder.id
				});
				const mockSelectId = jest.fn();

				const mocks = [mockGetBaseNode({ node_id: destinationFolder.id }, destinationFolder)];
				const { user } = setup(
					<UploadListItemWrapper
						node={file}
						isSelected={false}
						isSelectionModeActive={false}
						selectId={mockSelectId}
					/>,
					{ mocks }
				);

				const item = screen.getByText(file.name);
				expect(item).toBeVisible();
				await user.hover(item);
				expect(screen.getByTestId(ICON_REGEXP.goToFolder)).toBeInTheDocument();
			});

			test('Action is hidden if parent is not set', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: faker.helpers.objectValue(UploadStatus),
					parentNodeId: null
				});
				const mockSelectId = jest.fn();

				const mocks = [mockGetBaseNode({ node_id: destinationFolder.id }, destinationFolder)];
				const { user } = setup(
					<UploadListItemWrapper
						node={file}
						isSelected={false}
						isSelectionModeActive={false}
						selectId={mockSelectId}
					/>,
					{ mocks }
				);

				const item = screen.getByText(file.name);
				expect(item).toBeVisible();
				await user.hover(item);
				expect(screen.queryByTestId(ICON_REGEXP.goToFolder)).not.toBeInTheDocument();
			});
		});
	});
});
