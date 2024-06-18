/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';
import { forEach } from 'lodash';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import { NODES_LOAD_LIMIT } from '../constants';
import { ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFolder, populateNodePage, populateNodes } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { Resolvers } from '../types/graphql/resolvers-types';
import { Folder } from '../types/graphql/types';
import { mockGetNode, mockGetPath } from '../utils/resolverMocks';
import { setup, selectNodes, triggerListLoadMore } from '../utils/testUtils';

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions');

jest.mock<typeof import('./components/Displayer')>('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): React.JSX.Element => (
		<div data-testid="displayer-test-id">
			{props.translationKey}:{props.icons}
		</div>
	)
}));

describe('Folder View Selection mode', () => {
	test('if there is no element selected, all actions are visible and disabled', async () => {
		const currentFolder = populateFolder(10);

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

		await screen.findByText((currentFolder.children.nodes[0] as Node).name);
		expect(screen.getByText((currentFolder.children.nodes[0] as Node).name)).toBeVisible();
		expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
		await selectNodes([(currentFolder.children.nodes[0] as Node).id], user);
		// check that all wanted items are selected
		expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
		expect(screen.getByText(/select all/i)).toBeVisible();
		// deselect node. Selection mode remains active
		await selectNodes([(currentFolder.children.nodes[0] as Node).id], user);
		expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
		expect(screen.getAllByTestId(SELECTORS.uncheckedAvatar)).toHaveLength(
			currentFolder.children.nodes.length
		);
		expect(screen.getByText(/select all/i)).toBeVisible();

		expect(screen.queryByTestId(ICON_REGEXP.moveToTrash)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.rename)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.copy)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.move)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.flag)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.unflag)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.download)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.openDocument)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.restore)).not.toBeInTheDocument();
		expect(screen.queryByTestId(ICON_REGEXP.deletePermanently)).not.toBeInTheDocument();

		const arrowBack = screen.getByTestId(ICON_REGEXP.exitSelectionMode);
		expect(arrowBack).toBeVisible();
		await user.click(arrowBack);
		expect(arrowBack).not.toBeInTheDocument();
		expect(screen.queryByTestId(SELECTORS.uncheckedAvatar)).not.toBeInTheDocument();
		expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
		expect(screen.queryByText(/select all/i)).not.toBeInTheDocument();
	});

	test('if all loaded nodes are selected, unselect all action is visible', async () => {
		const currentFolder = populateFolder();
		const firstPage = populateNodes(NODES_LOAD_LIMIT);
		const secondPage = populateNodes(10);
		currentFolder.children = populateNodePage([...firstPage, ...secondPage]);
		forEach(currentFolder.children.nodes, (node) => {
			if (node) {
				node.parent = currentFolder;
			}
		});

		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				// use default children resolver to split children in pages
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

		await screen.findByText((currentFolder.children.nodes[0] as Folder).name);
		expect(screen.queryByText(/select all/i)).not.toBeInTheDocument();
		await selectNodes([(currentFolder.children.nodes[0] as Folder).id], user);
		// check that all wanted items are selected
		expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
		expect(screen.getByText(/\bselect all/i)).toBeVisible();
		await user.click(screen.getByText(/\bselect all/i));
		await screen.findByText(/deselect all/i);
		expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(firstPage.length);
		expect(screen.getByText(/deselect all/i)).toBeVisible();
		expect(screen.queryByText(/\bselect all/i)).not.toBeInTheDocument();
		await triggerListLoadMore();
		await screen.findByText(secondPage[0].name);
		expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(firstPage.length);
		expect(screen.queryByText(/deselect all/i)).not.toBeInTheDocument();
		expect(screen.getByText(/\bselect all/i)).toBeVisible();
		await user.click(screen.getByText(/\bselect all/i));
		await screen.findByText(/deselect all/i);
		expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(
			firstPage.length + secondPage.length
		);
		expect(screen.getByText(/deselect all/i)).toBeVisible();
		await user.click(screen.getByText(/deselect all/i));
		await screen.findByText(/\bselect all/i);
		expect(screen.getAllByTestId(SELECTORS.uncheckedAvatar)).toHaveLength(
			firstPage.length + secondPage.length
		);
		expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
	});
});
