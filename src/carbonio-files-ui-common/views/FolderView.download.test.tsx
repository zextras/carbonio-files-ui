/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act } from '@testing-library/react';

import FolderView from './FolderView';
import { ICON_REGEXP } from '../constants/test';
import * as useDownloadNodes from '../hooks/useDownloadNodes';
import { populateFolder } from '../mocks/mockUtils';
import { screen, selectNodes, setup, within } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { mockGetNode, mockGetPath } from '../utils/resolverMocks';

jest.mock<typeof import('./components/VirtualizedNodeListItem')>(
	'./components/VirtualizedNodeListItem'
);

jest.mock<typeof import('./components/NodeHoverBar')>('./components/NodeHoverBar');

describe('Download', () => {
	it('should download the whole folder if the user clicks on the download button', async () => {
		const downloadNodeFn = jest.fn();
		const downloadMultipleNodesFn = jest.fn();
		jest.spyOn(useDownloadNodes, 'useDownloadNodes').mockReturnValue({
			downloadNode: downloadNodeFn,
			downloadMultipleNodes: downloadMultipleNodesFn
		});

		const currentFolder = populateFolder();
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({
					getChildren: [currentFolder],
					getPermissions: [currentFolder]
				})
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		const downloadButton = screen.getByRoleWithIcon('button', {
			icon: ICON_REGEXP.downloadMultiple
		});
		expect(downloadButton).toBeVisible();
		await user.click(downloadButton);
		act(() => {
			// run timers of modal
			jest.advanceTimersToNextTimer();
		});
		const modal = await screen.findByTestId('modal');
		expect(within(modal).getAllByText('Download all')).toHaveLength(2);
		expect(
			within(modal).getByText(
				/You're about to download all your items. This operation may take several minutes./i
			)
		).toBeVisible();
		expect(within(modal).getByRole('button', { name: /close/i })).toBeVisible();
		const downloadAllButton = within(modal).getByRole('button', { name: /download all/i });
		expect(downloadAllButton).toBeVisible();
		await user.click(downloadAllButton);
		expect(downloadMultipleNodesFn).toHaveBeenCalledWith([currentFolder.id]);
		// modal is closed
		expect(modal).not.toBeInTheDocument();
	});

	it('should close the modal when the user clicks on close button', async () => {
		const currentFolder = populateFolder();
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({
					getChildren: [currentFolder],
					getPermissions: [currentFolder]
				})
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		await user.click(
			screen.getByRoleWithIcon('button', {
				icon: ICON_REGEXP.downloadMultiple
			})
		);
		act(() => {
			// run timers of modal
			jest.advanceTimersToNextTimer();
		});
		const modal = await screen.findByTestId('modal');
		expect(modal).toBeVisible();
		await user.click(within(modal).getByRole('button', { name: /close/i }));
		expect(modal).not.toBeInTheDocument();
	});

	it('should render the tooltip of the download button', async () => {
		const downloadNodeFn = jest.fn();
		const downloadMultipleNodesFn = jest.fn();
		jest.spyOn(useDownloadNodes, 'useDownloadNodes').mockReturnValue({
			downloadNode: downloadNodeFn,
			downloadMultipleNodes: downloadMultipleNodesFn
		});

		const currentFolder = populateFolder();
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({
					getChildren: [currentFolder],
					getPermissions: [currentFolder]
				})
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		await user.hover(
			screen.getByRoleWithIcon('button', {
				icon: ICON_REGEXP.downloadMultiple
			})
		);
		expect(await screen.findByText(/download all/i)).toBeVisible();
	});

	it('should call the DownloadMultipleNodes when the user selects multiple nodes and clicks on download button', async () => {
		const downloadNodeFn = jest.fn();
		const downloadMultipleNodesFn = jest.fn();
		jest.spyOn(useDownloadNodes, 'useDownloadNodes').mockReturnValue({
			downloadNode: downloadNodeFn,
			downloadMultipleNodes: downloadMultipleNodesFn
		});

		const currentFolder = populateFolder(5);
		const node1 = currentFolder.children.nodes[0]!;
		const node2 = currentFolder.children.nodes[1]!;

		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		await screen.findByText(node1.name);
		await selectNodes([node1.id, node2.id], user);
		const downloadButton = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.download });
		expect(downloadButton).toBeVisible();
		await user.click(downloadButton);
		expect(downloadMultipleNodesFn).toHaveBeenCalledWith([node1.id, node2.id]);
	});
});
