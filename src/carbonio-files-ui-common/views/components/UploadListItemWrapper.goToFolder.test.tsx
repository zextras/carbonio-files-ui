/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { fireEvent, screen } from '@testing-library/react';

import { UploadListItemWrapper } from './UploadListItemWrapper';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../../constants/test';
import { populateFolder, populateUploadItem } from '../../mocks/mockUtils';
import { UploadStatus } from '../../types/graphql/client-types';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { mockGetNode } from '../../utils/resolverMocks';
import { setup } from '../../utils/testUtils';

describe('Upload List Item Wrapper', () => {
	describe('Go to folder action', () => {
		describe('Contextual Menu', () => {
			test('Action is visible if parent is set', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: faker.helpers.objectValue(UploadStatus),
					parentNodeId: destinationFolder.id
				});
				const mockSelectedId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [destinationFolder] })
					}
				} satisfies Partial<Resolvers>;
				setup(
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
				const mockSelectedId = jest.fn();
				const mocks = {
					Query: {
						getNode: mockGetNode({ getBaseNode: [destinationFolder] })
					}
				} satisfies Partial<Resolvers>;
				setup(
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
				expect(screen.getByTestId(ICON_REGEXP.goToFolder)).toBeInTheDocument();
			});

			test('Action is hidden if parent is not set', async () => {
				const destinationFolder = populateFolder();
				const file = populateUploadItem({
					status: faker.helpers.objectValue(UploadStatus),
					parentNodeId: null
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
				expect(screen.queryByTestId(ICON_REGEXP.goToFolder)).not.toBeInTheDocument();
			});
		});
	});
});
