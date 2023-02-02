/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen, waitFor, within } from '@testing-library/react';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import { populateFile, populateFolder } from '../mocks/mockUtils';
import { NodeSort } from '../types/graphql/types';
import {
	getChildrenVariables,
	mockGetChild,
	mockGetChildren,
	mockGetPermissions
} from '../utils/mockUtils';
import { setup } from '../utils/testUtils';
import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest.fn(),
		removeCreateOptions: jest.fn()
	})
}));

jest.mock('./components/Displayer', () => ({
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

		const mocks = [
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
			mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
			mockGetChild({ node_id: currentFolder.id }, currentFolder),
			mockGetChildren(
				getChildrenVariables(currentFolder2.id, undefined, NodeSort.NameDesc),
				currentFolder2
			)
		];

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		await screen.findByText(filename1);

		const items = screen.getAllByTestId('node-item-', { exact: false });
		expect(within(items[0]).getByText('a')).toBeVisible();
		expect(within(items[1]).getByText('b')).toBeVisible();

		const sortIcon = screen.getByTestId('icon: ZaListOutline');
		expect(sortIcon).toBeInTheDocument();
		expect(sortIcon).toBeVisible();
		expect(sortIcon.parentElement).not.toHaveAttribute('disabled', '');
		// register tooltip listeners
		jest.advanceTimersToNextTimer();
		await user.click(sortIcon);
		const descendingOrderOption = await screen.findByText('Descending Order');
		await screen.findByText(/ascending order by name/i);
		await user.click(descendingOrderOption);
		await waitFor(() =>
			expect(screen.getAllByTestId('node-item-', { exact: false })[0]).toHaveTextContent('b')
		);
		await user.hover(screen.getByTestId('icon: AzListOutline'));
		// run timers of tooltip
		jest.advanceTimersToNextTimer();
		await screen.findByText(/descending order by name/i);
		const descItems = screen.getAllByTestId('node-item-', { exact: false });
		expect(within(descItems[0]).getByText('b')).toBeVisible();
		expect(within(descItems[1]).getByText('a')).toBeVisible();
	});
});
