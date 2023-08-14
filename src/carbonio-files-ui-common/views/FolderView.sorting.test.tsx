/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { waitFor } from '@testing-library/react';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import { ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFile, populateFolder, populateNodePage } from '../mocks/mockUtils';
import { FolderResolvers, NodeSort, Resolvers } from '../types/graphql/resolvers-types';
import { mockGetNode, mockGetPath } from '../utils/resolverMocks';
import { screen, setup, within } from '../utils/testUtils';

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions');

jest.mock<typeof import('./components/Displayer')>('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): JSX.Element => (
		<div data-testid="displayer-test-id">
			{props.translationKey}:{props.icons}
		</div>
	)
}));

describe('Sorting', () => {
	test('Switch from name ascending to name descending order', async () => {
		const currentFolder = populateFolder(0, 'currentFolderId');
		const currentFolder2 = populateFolder(0, 'currentFolderId');

		const fileId1 = 'fileId1';
		const filename1 = 'a';
		const file1 = populateFile(fileId1, filename1);
		file1.permissions.can_write_file = false;
		currentFolder.children.nodes.push(file1);

		const fileId2 = 'fileId2';
		const filename2 = 'b';
		const file2 = populateFile(fileId2, filename2);
		file2.permissions.can_write_file = false;
		currentFolder.children.nodes.push(file2);

		currentFolder2.children.nodes.push(file2);
		currentFolder2.children.nodes.push(file1);

		const childrenResolver: FolderResolvers['children'] = (parent, args) => {
			if (args.sort === NodeSort.NameDesc) {
				return populateNodePage([file2, file1]);
			}
			return populateNodePage([file1, file2]);
		};
		const mocks = {
			Folder: {
				children: childrenResolver
			},
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({
					getChildren: [currentFolder, currentFolder],
					getPermissions: [currentFolder]
				})
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		await screen.findByText(filename1);

		const items = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
		expect(within(items[0]).getByText('a')).toBeVisible();
		expect(within(items[1]).getByText('b')).toBeVisible();

		const sortIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.sortDesc });
		expect(sortIcon).toBeVisible();
		expect(sortIcon).toBeEnabled();
		// register tooltip listeners
		jest.advanceTimersToNextTimer();
		await user.click(sortIcon);
		const descendingOrderOption = await screen.findByText('Descending Order');
		await screen.findByText(/ascending order by name/i);
		await user.click(descendingOrderOption);
		await waitFor(() =>
			expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })[0]).toHaveTextContent(
				'b'
			)
		);
		await user.hover(screen.getByTestId(ICON_REGEXP.sortAsc));
		// run timers of tooltip
		jest.advanceTimersToNextTimer();
		await screen.findByText(/descending order by name/i);
		const descItems = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
		expect(within(descItems[0]).getByText('b')).toBeVisible();
		expect(within(descItems[1]).getByText('a')).toBeVisible();
	});
});
