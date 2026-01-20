/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act } from '@testing-library/react';

import FolderView from './FolderView';
import { ROOTS } from '../constants';
import { ICON_REGEXP } from '../constants/test';
import { populateFolder } from '../mocks/mockUtils';
import { screen, setup, within } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { mockGetNode, mockGetPath } from '../utils/resolverMocks';
import * as utils from '../utils/utils';

vi.mock('./components/VirtualizedNodeListItem');

vi.mock('./components/NodeHoverBar');

describe('Download', () => {
	it('should download the whole ROOT if the user clicks on the download all button on the root', async () => {
		const downloadMultipleNodesFn = vi.spyOn(utils, 'downloadMultipleNodes');

		const currentFolder = populateFolder(3, ROOTS.LOCAL_ROOT);
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

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		const downloadButton = await screen.findByRoleWithIcon('button', {
			icon: ICON_REGEXP.downloadMultiple
		});
		expect(downloadButton).toBeVisible();
		await user.click(downloadButton);
		act(() => {
			// run timers of modal
			vi.advanceTimersToNextTimer();
		});
		const modal = await screen.findByTestId('modal');
		expect(within(modal).getAllByText('Download all')).toHaveLength(2);
		expect(
			within(modal).getByText(
				/You're about to download all your items. This operation may take several minutes./i
			)
		).toBeVisible();
		expect(within(modal).getByRole('button', { name: /cancel/i })).toBeVisible();
		const downloadAllButton = within(modal).getByRole('button', { name: /download all/i });
		expect(downloadAllButton).toBeVisible();
		await user.click(downloadAllButton);
		expect(downloadMultipleNodesFn).toHaveBeenCalledWith([ROOTS.LOCAL_ROOT]);
		// modal is closed
		expect(modal).not.toBeInTheDocument();
	});

	it('should download the whole folder if the user clicks on the download all button on a folder', async () => {
		const downloadMultipleNodesFn = vi.spyOn(utils, 'downloadMultipleNodes');

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

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		const downloadButton = await screen.findByRoleWithIcon('button', {
			icon: ICON_REGEXP.downloadMultiple
		});
		expect(downloadButton).toBeVisible();
		await user.click(downloadButton);
		act(() => {
			// run timers of modal
			vi.advanceTimersToNextTimer();
		});
		const modal = await screen.findByTestId('modal');
		expect(within(modal).getByText(`Download ${currentFolder.name}`)).toBeVisible();
		expect(
			within(modal).getByText(
				/You're about to download all your items in this folder. This operation may take several minutes./i
			)
		).toBeVisible();
		expect(within(modal).getByRole('button', { name: /cancel/i })).toBeVisible();
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

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		await user.click(
			await screen.findByRoleWithIcon('button', {
				icon: ICON_REGEXP.downloadMultiple
			})
		);
		act(() => {
			// run timers of modal
			vi.advanceTimersToNextTimer();
		});
		const modal = await screen.findByTestId('modal');
		expect(modal).toBeVisible();
		await user.click(within(modal).getByRole('button', { name: /cancel/i }));
		expect(modal).not.toBeInTheDocument();
	});

	it('should render the tooltip of the download button', async () => {
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

		await act(async () => {
			await vi.advanceTimersToNextTimerAsync();
		});
		await user.hover(
			await screen.findByRoleWithIcon('button', {
				icon: ICON_REGEXP.downloadMultiple
			})
		);
		expect(await screen.findByText(/download all/i)).toBeVisible();
	});
});
