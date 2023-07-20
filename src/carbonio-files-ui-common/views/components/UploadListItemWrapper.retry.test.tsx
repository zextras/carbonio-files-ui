/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { fireEvent, screen } from '@testing-library/react';

import { UploadListItemWrapper } from './UploadListItemWrapper';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateFolder, populateUploadItem } from '../../mocks/mockUtils';
import { UploadStatus } from '../../types/graphql/client-types';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { mockGetNode } from '../../utils/mockUtils';
import { setup } from '../../utils/testUtils';

describe('Upload List Item Wrapper', () => {
	describe('Retry action', () => {
		describe('Contextual menu', () => {
			test('Action is hidden if status is loading', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.LOADING,
					parentNodeId: destinationFolder.id
				});
				const mockSelectId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode(destinationFolder)
					}
				} satisfies Partial<Resolvers>;
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
				expect(screen.queryByText(ACTION_REGEXP.retryUpload)).not.toBeInTheDocument();
			});

			test('Action is hidden if status is completed', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.COMPLETED,
					parentNodeId: destinationFolder.id
				});
				const mockSelectId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode(destinationFolder)
					}
				} satisfies Partial<Resolvers>;
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
				expect(screen.queryByText(ACTION_REGEXP.retryUpload)).not.toBeInTheDocument();
			});

			test('Action is hidden if status is queued', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.QUEUED,
					parentNodeId: destinationFolder.id
				});
				const mockSelectId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode(destinationFolder)
					}
				} satisfies Partial<Resolvers>;
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
				expect(screen.queryByText(ACTION_REGEXP.retryUpload)).not.toBeInTheDocument();
			});

			test('Action is visible if status is failed', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.FAILED,
					parentNodeId: destinationFolder.id
				});
				const mockSelectId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode(destinationFolder)
					}
				} satisfies Partial<Resolvers>;
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
				expect(screen.getByText(ACTION_REGEXP.retryUpload)).toBeVisible();
			});
		});

		describe('Hover bar', () => {
			test('Action is hidden if status is loading', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.LOADING,
					parentNodeId: destinationFolder.id
				});
				const mockSelectId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode(destinationFolder)
					}
				} satisfies Partial<Resolvers>;
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
				expect(screen.queryByTestId(ICON_REGEXP.retryUpload)).not.toBeInTheDocument();
			});

			test('Action is hidden if status is completed', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.COMPLETED,
					parentNodeId: destinationFolder.id
				});
				const mockSelectId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode(destinationFolder)
					}
				} satisfies Partial<Resolvers>;
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
				expect(screen.queryByTestId(ICON_REGEXP.retryUpload)).not.toBeInTheDocument();
			});

			test('Action is hidden if status is queued', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.QUEUED,
					parentNodeId: destinationFolder.id
				});
				const mockSelectId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode(destinationFolder)
					}
				} satisfies Partial<Resolvers>;
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
				expect(screen.queryByTestId(ICON_REGEXP.retryUpload)).not.toBeInTheDocument();
			});

			test('Action is visible if status is failed', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: UploadStatus.FAILED,
					parentNodeId: destinationFolder.id
				});
				const mockSelectId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode(destinationFolder)
					}
				} satisfies Partial<Resolvers>;
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
				expect(screen.getByTestId(ICON_REGEXP.retryUpload)).toBeInTheDocument();
			});
		});
	});
});
