/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { screen } from '@testing-library/react';

import { UploadListItemWrapper } from './UploadListItemWrapper';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateFolder, populateUploadItem } from '../../mocks/mockUtils';
import { setup } from '../../tests/utils';
import { UploadStatus } from '../../types/graphql/client-types';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { mockGetNode } from '../../utils/resolverMocks';

describe('Upload List Item Wrapper', () => {
	describe('Remove action', () => {
		describe('Contextual Menu', () => {
			test('Action is visible if item is failed', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.FAILED,
					parentNodeId: destinationFolder.id
				});
				const mockSelectedId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [destinationFolder] })
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(
					<UploadListItemWrapper
						node={file}
						isSelected={false}
						isSelectionModeActive={false}
						selectId={mockSelectedId}
					/>,
					{ mocks }
				);

				const item = screen.getByText(file.name);
				expect(item).toBeVisible();
				await user.rightClick(item);
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.getByText(ACTION_REGEXP.removeUpload)).toBeVisible();
			});

			test('Action is visible if item is loading', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.LOADING,
					parentNodeId: destinationFolder.id
				});
				const mockSelectedId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [destinationFolder] })
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(
					<UploadListItemWrapper
						node={file}
						isSelected={false}
						isSelectionModeActive={false}
						selectId={mockSelectedId}
					/>,
					{ mocks }
				);

				const item = screen.getByText(file.name);
				expect(item).toBeVisible();
				await user.rightClick(item);
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.getByText(ACTION_REGEXP.removeUpload)).toBeVisible();
			});

			test('Action is visible if item is queued', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.QUEUED,
					parentNodeId: destinationFolder.id
				});
				const mockSelectedId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [destinationFolder] })
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(
					<UploadListItemWrapper
						node={file}
						isSelected={false}
						isSelectionModeActive={false}
						selectId={mockSelectedId}
					/>,
					{ mocks }
				);

				const item = screen.getByText(file.name);
				expect(item).toBeVisible();
				await user.rightClick(item);
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.getByText(ACTION_REGEXP.removeUpload)).toBeVisible();
			});

			test('Action is visible if item is completed', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.COMPLETED,
					nodeId: faker.string.uuid(),
					parentNodeId: destinationFolder.id
				});
				const mockSelectedId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [destinationFolder] })
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(
					<UploadListItemWrapper
						node={file}
						isSelected={false}
						isSelectionModeActive={false}
						selectId={mockSelectedId}
					/>,
					{ mocks }
				);

				const item = screen.getByText(file.name);
				expect(item).toBeVisible();
				await user.rightClick(item);
				await screen.findByTestId(SELECTORS.dropdownList);
				expect(screen.getByText(ACTION_REGEXP.removeUpload)).toBeVisible();
			});
		});

		describe('Hover bar', () => {
			test('Action is visible if item is failed', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.FAILED,
					parentNodeId: destinationFolder.id
				});
				const mockSelectedId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [destinationFolder] })
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(
					<UploadListItemWrapper
						node={file}
						isSelected={false}
						isSelectionModeActive={false}
						selectId={mockSelectedId}
					/>,
					{ mocks }
				);

				const item = screen.getByText(file.name);
				expect(item).toBeVisible();
				await user.hover(item);
				expect(screen.getByTestId(ICON_REGEXP.removeUpload)).toBeInTheDocument();
			});

			test('Action is visible if item is loading', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.LOADING,
					parentNodeId: destinationFolder.id
				});
				const mockSelectedId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [destinationFolder] })
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(
					<UploadListItemWrapper
						node={file}
						isSelected={false}
						isSelectionModeActive={false}
						selectId={mockSelectedId}
					/>,
					{ mocks }
				);

				const item = screen.getByText(file.name);
				expect(item).toBeVisible();
				await user.hover(item);
				expect(screen.getByTestId(ICON_REGEXP.removeUpload)).toBeInTheDocument();
			});

			test('Action is visible if item is queued', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.QUEUED,
					parentNodeId: destinationFolder.id
				});
				const mockSelectedId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [destinationFolder] })
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(
					<UploadListItemWrapper
						node={file}
						isSelected={false}
						isSelectionModeActive={false}
						selectId={mockSelectedId}
					/>,
					{ mocks }
				);

				const item = screen.getByText(file.name);
				expect(item).toBeVisible();
				await user.hover(item);
				expect(screen.getByTestId(ICON_REGEXP.removeUpload)).toBeInTheDocument();
			});

			test('Action is visible if item is completed', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.COMPLETED,
					parentNodeId: destinationFolder.id
				});
				const mockSelectedId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [destinationFolder] })
					}
				} satisfies Partial<Resolvers>;
				const { user } = setup(
					<UploadListItemWrapper
						node={file}
						isSelected={false}
						isSelectionModeActive={false}
						selectId={mockSelectedId}
					/>,
					{ mocks }
				);

				const item = screen.getByText(file.name);
				expect(item).toBeVisible();
				await user.hover(item);
				expect(screen.getByTestId(ICON_REGEXP.removeUpload)).toBeInTheDocument();
			});
		});
	});
});
