/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import { ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFolder } from '../mocks/mockUtils';
import { screen, setup } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { mockGetNode, mockGetPath } from '../utils/resolverMocks';

jest.mock<typeof import('./components/Displayer')>('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): React.JSX.Element => (
		<div data-testid="displayer-test-id">
			{props.translationKey}:{props.icons}
		</div>
	)
}));

jest.mock<typeof import('./components/VirtualizedNodeListItem')>(
	'./components/VirtualizedNodeListItem'
);

describe('View Mode', () => {
	it('should switch between list view and grid view', async () => {
		const currentFolder = populateFolder(1, 'currentFolderId');
		const mocks = {
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

		await screen.findByText(currentFolder.children.nodes[0]!.name);
		const gridModeIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.gridViewMode });
		expect(gridModeIcon).toBeVisible();
		expect(screen.getByTestId(SELECTORS.mainList)).toBeVisible();
		await user.click(gridModeIcon);
		const listModeIcon = screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.listViewMode });
		expect(listModeIcon).toBeVisible();
		expect(screen.getByTestId(SELECTORS.mainGrid)).toBeVisible();
		await user.click(listModeIcon);
		expect(screen.getByRoleWithIcon('button', { icon: ICON_REGEXP.gridViewMode })).toBeVisible();
		expect(screen.getByTestId(SELECTORS.mainList)).toBeVisible();
	});
});
