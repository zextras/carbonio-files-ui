/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { fireEvent, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { forEach, map } from 'lodash';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFolder, populateNode } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { Folder } from '../types/graphql/types';
import {
	getChildrenVariables,
	mockFlagNodes,
	mockGetChild,
	mockGetChildren,
	mockGetPermissions
} from '../utils/mockUtils';
import { setup, selectNodes } from '../utils/testUtils';
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

describe('Flag', () => {
	describe('Selection mode', () => {
		test('Flag/Unflag action marks all and only selected items as flagged/unflagged', async () => {
			const currentFolder = populateFolder(4);
			forEach(currentFolder.children.nodes, (mockedNode) => {
				(mockedNode as Node).flagged = false;
			});

			const nodesIdsToFlag = map(
				currentFolder.children.nodes.slice(0, currentFolder.children.nodes.length / 2),
				(child) => (child as Node).id
			);

			const nodesIdsToUnflag = nodesIdsToFlag.slice(0, nodesIdsToFlag.length / 2);

			const mocks = [
				mockGetChildren(getChildrenVariables(currentFolder.id), {
					...currentFolder,
					children: currentFolder.children
				} as Folder),
				mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
				mockGetChild({ node_id: currentFolder.id }, currentFolder),
				mockFlagNodes(
					{
						node_ids: nodesIdsToFlag,
						flag: true
					},
					nodesIdsToFlag
				),
				mockFlagNodes(
					{
						node_ids: nodesIdsToUnflag,
						flag: false
					},
					nodesIdsToUnflag
				)
			];

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			// wait for the load to be completed
			await waitForElementToBeRemoved(screen.queryByTestId('icon: Refresh'));
			expect(screen.queryByTestId('icon: Flag')).not.toBeInTheDocument();

			// activate selection mode by selecting items
			await selectNodes(nodesIdsToFlag, user);

			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodesIdsToFlag.length);

			const flagIcon = await screen.findByTestId(ICON_REGEXP.flag);
			// click on flag action on header bar
			await user.click(flagIcon);
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			await screen.findAllByTestId('icon: Flag');
			expect(screen.getAllByTestId('icon: Flag')).toHaveLength(nodesIdsToFlag.length);

			// activate selection mode by selecting items
			await selectNodes(nodesIdsToUnflag, user);
			// check that all wanted items are selected
			expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodesIdsToUnflag.length);
			// if present, open the additional actions
			const moreActionsItem = screen.queryByTestId('icon: MoreVertical');
			if (moreActionsItem !== null) {
				await user.click(moreActionsItem);
				await screen.findByTestId(SELECTORS.dropdownList);
			}
			const unflagIcon = await screen.findByTestId(ICON_REGEXP.unflag);
			await user.click(unflagIcon);
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			await screen.findAllByTestId('icon: Flag');
			expect(screen.getAllByTestId('icon: Flag')).toHaveLength(
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

			const mocks = [
				mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
				mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
				mockGetChild({ node_id: currentFolder.id }, currentFolder),
				mockFlagNodes(
					{
						node_ids: [node.id],
						flag: true
					},
					[node.id]
				),
				mockFlagNodes(
					{
						node_ids: [node.id],
						flag: false
					},
					[node.id]
				)
			];

			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});

			// wait for the load to be completed
			await waitForElementToBeRemoved(screen.queryByTestId('icon: Refresh'));

			// right click to open contextual menu
			const nodeItem = screen.getByTestId(`node-item-${node.id}`);
			// open context menu and click on flag action
			fireEvent.contextMenu(nodeItem);
			const flagAction = await screen.findByText(ACTION_REGEXP.flag);
			expect(flagAction).toBeVisible();
			await user.click(flagAction);
			await within(nodeItem).findByTestId('icon: Flag');
			expect(flagAction).not.toBeInTheDocument();
			expect(within(nodeItem).getByTestId('icon: Flag')).toBeVisible();
			// open context menu and click on unflag action
			fireEvent.contextMenu(nodeItem);
			const unflagAction = await screen.findByText(ACTION_REGEXP.unflag);
			expect(unflagAction).toBeVisible();
			await user.click(unflagAction);
			expect(unflagAction).not.toBeInTheDocument();
			expect(within(nodeItem).queryByTestId('icon: Flag')).not.toBeInTheDocument();
		});
	});
});
