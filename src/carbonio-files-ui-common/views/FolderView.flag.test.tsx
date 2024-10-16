/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { waitForElementToBeRemoved } from '@testing-library/react';
import { forEach, map } from 'lodash';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFolder, populateNode } from '../mocks/mockUtils';
import { setup, selectNodes, screen, within } from '../tests/utils';
import { Resolvers } from '../types/graphql/resolvers-types';
import { mockFlagNodes, mockGetNode, mockGetPath } from '../utils/resolverMocks';

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

describe('Flag', () => {
	describe('Selection mode', () => {
		test('Flag/Unflag action marks all and only selected items as flagged/unflagged', async () => {
			const currentFolder = populateFolder(4);
			forEach(currentFolder.children.nodes, (mockedNode) => {
				if (mockedNode) {
					mockedNode.flagged = false;
				}
			});

			const nodesIdsToFlag = map(
				currentFolder.children.nodes.slice(0, currentFolder.children.nodes.length / 2),
				(child) => child!.id
			);

			const nodesIdsToUnflag = nodesIdsToFlag.slice(0, nodesIdsToFlag.length / 2);

			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
				},
				Mutation: {
					flagNodes: mockFlagNodes(nodesIdsToFlag, nodesIdsToUnflag)
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			// wait for the load to be completed
			await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
			expect(screen.queryByTestId(ICON_REGEXP.flagged)).not.toBeInTheDocument();
			// activate selection mode by selecting items
			await selectNodes(nodesIdsToFlag, user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodesIdsToFlag.length);
			// click on flag action on header bar
			await user.click(await screen.findByRoleWithIcon('button', { icon: ICON_REGEXP.flag }));
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			expect(await screen.findAllByTestId(ICON_REGEXP.flagged)).toHaveLength(nodesIdsToFlag.length);
			// activate selection mode by selecting items
			await selectNodes(nodesIdsToUnflag, user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodesIdsToUnflag.length);
			const listHeader = screen.getByTestId(SELECTORS.listHeaderSelectionMode);
			const iconAction = within(listHeader).queryByRoleWithIcon('button', {
				icon: ICON_REGEXP.unflag
			});
			if (iconAction !== null) {
				await user.click(iconAction);
			} else {
				await user.click(within(listHeader).getByTestId(ICON_REGEXP.moreVertical));
				const dropdown = await screen.findByTestId(SELECTORS.dropdownList);
				await user.click(within(dropdown).getByText(/unflag/i));
			}
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			expect(await screen.findAllByTestId(ICON_REGEXP.flagged)).toHaveLength(
				nodesIdsToFlag.length - nodesIdsToUnflag.length
			);
		});
	});

	describe('Contextual menu actions', () => {
		test('click on flag action changes flag icon visibility', async () => {
			const currentFolder = populateFolder();
			const node = populateNode();
			// set the node not flagged so that we can search by flag action in the contextual menu of first node
			node.flagged = false;
			currentFolder.children.nodes.push(node);

			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
				},
				Mutation: {
					flagNodes: mockFlagNodes([node.id], [node.id])
				}
			} satisfies Partial<Resolvers>;

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			// wait for the load to be completed
			await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));

			// right click to open contextual menu
			const nodeItem = screen.getByTestId(SELECTORS.nodeItem(node.id));
			// open context menu and click on flag action
			await user.rightClick(nodeItem);
			const flagAction = await screen.findByText(ACTION_REGEXP.flag);
			expect(flagAction).toBeVisible();
			await user.click(flagAction);
			await within(nodeItem).findByTestId(ICON_REGEXP.flagged);
			expect(flagAction).not.toBeInTheDocument();
			expect(within(nodeItem).getByTestId(ICON_REGEXP.flagged)).toBeVisible();
			// open context menu and click on unflag action
			await user.rightClick(nodeItem);
			const unflagAction = await screen.findByText(ACTION_REGEXP.unflag);
			expect(unflagAction).toBeVisible();
			await user.click(unflagAction);
			expect(unflagAction).not.toBeInTheDocument();
			expect(within(nodeItem).queryByTestId(ICON_REGEXP.flagged)).not.toBeInTheDocument();
		});
	});
});
