/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { screen } from '@testing-library/react';
import { forEach } from 'lodash';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import { NODES_LOAD_LIMIT } from '../constants';
import { ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFolder, populateNodePage, populateNodes } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { Folder } from '../types/graphql/types';
import {
	getChildrenVariables,
	mockGetChild,
	mockGetChildren,
	mockGetParent,
	mockGetPermissions
} from '../utils/mockUtils';
import { setup, selectNodes, triggerLoadMore } from '../utils/testUtils';
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

describe('Folder View Selection mode', () => {
	test('if there is no element selected, all actions are visible and disabled', async () => {
		const currentFolder = populateFolder(10);
		const mocks = [
			mockGetParent({ node_id: currentFolder.id }, currentFolder),
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
			mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
			mockGetChild({ node_id: currentFolder.id }, currentFolder)
		];
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

		const arrowBack = screen.getByTestId('icon: ArrowBackOutline');
		expect(arrowBack).toBeVisible();
		await user.click(arrowBack);
		expect(arrowBack).not.toBeInTheDocument();
		expect(screen.queryByTestId(SELECTORS.uncheckedAvatar)).not.toBeInTheDocument();
		expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
		expect(screen.queryByText(/select all/i)).not.toBeInTheDocument();
	});

	test('if all loaded nodes are selected, unselect all action is visible', async () => {
		const currentFolder = populateFolder(NODES_LOAD_LIMIT);
		const secondPage = populateNodes(10) as Node[];
		forEach(secondPage, (mockedNode) => {
			mockedNode.parent = currentFolder;
		});
		const mocks = [
			mockGetParent({ node_id: currentFolder.id }, currentFolder),
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
			mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
			mockGetChild({ node_id: currentFolder.id }, currentFolder),
			mockGetChildren(
				getChildrenVariables(currentFolder.id, undefined, undefined, undefined, true),
				{ ...currentFolder, children: populateNodePage(secondPage) } as Folder
			)
		];
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
		expect(screen.queryByTestId(SELECTORS.uncheckedAvatar)).not.toBeInTheDocument();
		expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(
			currentFolder.children.nodes.length
		);
		expect(screen.getByText(/deselect all/i)).toBeVisible();
		expect(screen.queryByText(/\bselect all/i)).not.toBeInTheDocument();
		await triggerLoadMore();
		await screen.findByText(secondPage[0].name);
		expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(
			currentFolder.children.nodes.length
		);
		expect(screen.getAllByTestId(SELECTORS.uncheckedAvatar)).toHaveLength(secondPage.length);
		expect(screen.queryByText(/deselect all/i)).not.toBeInTheDocument();
		expect(screen.getByText(/\bselect all/i)).toBeVisible();
		await user.click(screen.getByText(/\bselect all/i));
		await screen.findByText(/deselect all/i);
		expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(
			currentFolder.children.nodes.length + secondPage.length
		);
		expect(screen.queryByTestId(SELECTORS.uncheckedAvatar)).not.toBeInTheDocument();
		expect(screen.getByText(/deselect all/i)).toBeVisible();
		await user.click(screen.getByText(/deselect all/i));
		await screen.findByText(/\bselect all/i);
		expect(screen.getAllByTestId(SELECTORS.uncheckedAvatar)).toHaveLength(
			currentFolder.children.nodes.length + secondPage.length
		);
		expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
	});
});
