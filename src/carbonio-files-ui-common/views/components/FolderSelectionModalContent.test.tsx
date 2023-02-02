/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */

import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import 'jest-styled-components';
import { map } from 'lodash';
import { find as findStyled } from 'styled-components/test-utils';

import { destinationVar } from '../../apollo/destinationVar';
import { ROOTS } from '../../constants';
import {
	populateFile,
	populateFolder,
	populateLocalRoot,
	populateNodePage,
	populateNodes,
	populateParents
} from '../../mocks/mockUtils';
import { Node } from '../../types/graphql/types';
import {
	getChildrenVariables,
	getFindNodesVariables,
	mockFindNodes,
	mockGetChild,
	mockGetChildren,
	mockGetPath
} from '../../utils/mockUtils';
import { buildBreadCrumbRegExp, setup } from '../../utils/testUtils';
import { FolderSelectionModalContent } from './FolderSelectionModalContent';
import { HoverContainer } from './StyledComponents';

const confirmAction = jest.fn(() => {
	// clone implementation of the function contained in the close callback of useCopyContent
	destinationVar({ defaultValue: undefined, currentValue: undefined });
});
const resetToDefault = jest.fn(() => {
	// clone implementation of the function contained in the click callback of useCopyContent
	destinationVar({ ...destinationVar(), currentValue: destinationVar().defaultValue });
});

beforeEach(() => {
	confirmAction.mockClear();
	resetToDefault.mockClear();
});

describe('Folder Selection Modal Content', () => {
	test('show roots if no folder is set. Choose button is disabled', async () => {
		const { user } = setup(
			<div onClick={resetToDefault}>
				<FolderSelectionModalContent confirmAction={confirmAction} />
			</div>,
			{
				mocks: []
			}
		);

		await screen.findByText(/home/i);
		expect(screen.getByText('Home')).toBeVisible();
		expect(screen.getByText('Shared with me')).toBeVisible();
		expect(screen.getByText('Trash')).toBeVisible();
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).toBeVisible();
		expect(chooseButton).toHaveAttribute('disabled');
		await user.click(chooseButton);
		expect(confirmAction).not.toHaveBeenCalled();
	});

	test('show folder in list if parent is set. Choose button is disabled if active folder is same as the set one', async () => {
		const folder = populateFolder();
		const folder2 = populateFolder();
		const file = populateFile();
		const parent = populateFolder();
		const { path } = populateParents(parent, 2, true);
		parent.children = populateNodePage([folder, folder2, file]);
		folder.parent = parent;
		folder2.parent = parent;
		file.parent = parent;

		const mocks = [
			// request to find out parent
			mockGetPath({ node_id: folder.id }, [...path, folder]),
			// request to create breadcrumb
			mockGetPath({ node_id: parent.id }, path),
			mockGetChildren(getChildrenVariables(parent.id), parent)
		];

		const { findByTextWithMarkup, user } = setup(
			<div onClick={resetToDefault}>
				<FolderSelectionModalContent folderId={folder.id} confirmAction={confirmAction} />
			</div>,
			{
				mocks
			}
		);
		await screen.findByText(folder.name);
		const breadcrumbItem = await findByTextWithMarkup(
			buildBreadCrumbRegExp('Files', ...map(path, (node) => node.name))
		);
		expect(breadcrumbItem).toBeVisible();
		expect(screen.getByText(folder.name)).toBeVisible();
		expect(screen.getByText(folder2.name)).toBeVisible();
		expect(screen.getByText(file.name)).toBeVisible();
		// file nodes are disabled
		// expect(screen.getByTestId(`node-item-${file.id}`)).toHaveAttribute('disabled', '');
		// expect(screen.getByTestId(`node-item-${folder.id}`)).not.toHaveAttribute('disabled', '');
		// expect(screen.getByTestId(`node-item-${folder2.id}`)).not.toHaveAttribute('disabled', '');
		// choose button is disabled because active folder is same as set one
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).toBeVisible();
		expect(chooseButton).toHaveAttribute('disabled', '');
		await user.click(chooseButton);
		expect(confirmAction).not.toHaveBeenCalled();
		// click on disabled choose button should leave the button disabled
		expect(chooseButton).toHaveAttribute('disabled', '');
		// click on disabled node set opened folder as active
		await user.click(screen.getByText(file.name));
		// choose button becomes active. Opened folder is a valid selection
		await waitFor(() => expect(chooseButton).not.toHaveAttribute('disabled', ''));
		await user.click(chooseButton);
		expect(confirmAction).toHaveBeenCalled();
		expect(confirmAction).toHaveBeenCalledWith(
			expect.objectContaining({
				id: parent.id,
				name: parent.name
			}),
			true
		);
		// confirm reset active folder in the modal
		expect(chooseButton).toHaveAttribute('disabled', '');
		// click on other folder
		await user.click(screen.getByText(folder2.name));
		// choose button becomes active. Other folder is a valid selection
		await waitFor(() => expect(chooseButton).not.toHaveAttribute('disabled', ''));
		await user.click(chooseButton);
		expect(confirmAction).toHaveBeenCalled();
		expect(confirmAction).toHaveBeenCalledWith(
			expect.objectContaining({
				id: folder2.id,
				name: folder2.name
			}),
			true
		);
		// confirm reset active folder in the modal
		expect(chooseButton).toHaveAttribute('disabled', '');
		// click on other folder
		await user.click(screen.getByText(folder2.name));
		// choose button becomes active. Other folder is a valid selection
		await waitFor(() => expect(chooseButton).not.toHaveAttribute('disabled', ''));
		// click on set folder
		await user.click(screen.getByText(folder.name));
		// choose button becomes disabled. Folder already set in advanced params is not a valid selection
		await waitFor(() => expect(chooseButton).toHaveAttribute('disabled'));
	});

	test('root items are valid, roots entry point is not valid', async () => {
		const localRoot = populateFolder(2, ROOTS.LOCAL_ROOT);

		const mocks = [
			// request to find out parent
			mockGetPath({ node_id: localRoot.id }, [localRoot]),
			mockGetChildren(getChildrenVariables(localRoot.id), localRoot)
		];

		const { findByTextWithMarkup, user } = setup(
			<div onClick={resetToDefault}>
				<FolderSelectionModalContent folderId={localRoot.id} confirmAction={confirmAction} />
			</div>,
			{
				mocks
			}
		);

		await screen.findByText(/home/i);
		const breadcrumbItem = await findByTextWithMarkup(buildBreadCrumbRegExp('Files'));
		expect(breadcrumbItem).toBeVisible();
		expect(screen.getByText(/home/i)).toBeVisible();
		// ugly but it's the only way to check the item is visibly active
		expect(findStyled(screen.getByTestId(`node-item-${localRoot.id}`), HoverContainer)).toHaveStyle(
			'background-color: #d5e3f6'
		);
		expect(screen.getByText(/shared with me/i)).toBeVisible();
		expect(screen.getByText(/trash/i)).toBeVisible();
		// choose button is disabled because active folder is same as set one
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).toBeVisible();
		expect(chooseButton).toHaveAttribute('disabled', '');
		// click on other root
		await user.click(screen.getByText(/shared with me/i));
		await waitFor(() => expect(chooseButton).not.toHaveAttribute('disabled', ''));
		// active root is become the clicked root
		expect(
			findStyled(screen.getByTestId(`node-item-${ROOTS.SHARED_WITH_ME}`), HoverContainer)
		).toHaveStyle('background-color: #d5e3f6');
		expect(
			findStyled(screen.getByTestId(`node-item-${localRoot.id}`), HoverContainer)
		).not.toHaveStyle('background-color: #d5e3f6');
		// click on subtitle to reset active folder
		await user.click(screen.getByText(/searched only inside the selected folder/i));
		// choose button becomes disabled because roots list entry point is not a valid selection
		await waitFor(() => expect(chooseButton).toHaveAttribute('disabled'));
		await user.click(chooseButton);
		expect(confirmAction).not.toHaveBeenCalled();
	});

	test('navigation through breadcrumb reset active folder', async () => {
		const localRoot = populateFolder(2, ROOTS.LOCAL_ROOT);
		const folder = populateFolder();
		localRoot.children.nodes.push(folder);
		folder.parent = localRoot;

		const mocks = [
			// request to find out parent
			mockGetPath({ node_id: localRoot.id }, [localRoot]),
			mockGetChildren(getChildrenVariables(localRoot.id), localRoot),
			// request to create breadcrumb
			mockGetPath({ node_id: folder.id }, [localRoot, folder]),
			mockGetChildren(getChildrenVariables(folder.id), folder)
		];

		const { findByTextWithMarkup, user } = setup(
			<div onClick={resetToDefault}>
				<FolderSelectionModalContent folderId={localRoot.id} confirmAction={confirmAction} />
			</div>,
			{
				mocks
			}
		);

		await screen.findByText(/home/i);
		let breadcrumbItem = await findByTextWithMarkup(buildBreadCrumbRegExp('Files'));
		expect(breadcrumbItem).toBeVisible();
		expect(screen.getByText(/home/i)).toBeVisible();
		// ugly but it's the only way to check the item is visibly active
		expect(findStyled(screen.getByTestId(`node-item-${localRoot.id}`), HoverContainer)).toHaveStyle(
			'background-color: #d5e3f6'
		);
		await user.dblClick(screen.getByText(/home/i));
		await screen.findByText(folder.name);
		expect(screen.getByText(folder.name)).toBeVisible();
		expect(screen.getByText((localRoot.children.nodes[0] as Node).name)).toBeVisible();
		breadcrumbItem = await findByTextWithMarkup(buildBreadCrumbRegExp('Files', folder.parent.name));
		expect(breadcrumbItem).toBeVisible();
		// choose button is disabled because active folder (opened folder) is same as set one
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).toBeVisible();
		expect(chooseButton).toHaveAttribute('disabled', '');
		// navigate back to the roots list through breadcrumb
		await user.click(screen.getByText('Files'));
		// wait roots list to be rendered
		await screen.findByText(/home/i);
		expect(screen.queryByText(folder.name)).not.toBeInTheDocument();
		expect(screen.getByText(/home/i)).toBeVisible();
		expect(screen.getByText(/shared with me/i)).toBeVisible();
		expect(screen.getByText(/trash/i)).toBeVisible();
		// choose button is disabled because is now referring the entry point, which is not valid
		expect(chooseButton).toHaveAttribute('disabled', '');
		// local root item is not visibly active
		expect(
			findStyled(screen.getByTestId(`node-item-${localRoot.id}`), HoverContainer)
		).not.toHaveStyle('background-color: #d5e3f6');
		await user.click(chooseButton);
		expect(confirmAction).not.toHaveBeenCalled();
		// navigate again inside local root
		await user.dblClick(screen.getByText(/home/i));
		await screen.findByText(folder.name);
		expect(screen.getByText(folder.name)).toBeVisible();
		expect(screen.getByText((localRoot.children.nodes[0] as Node).name)).toBeVisible();
		breadcrumbItem = await findByTextWithMarkup(buildBreadCrumbRegExp('Files', folder.parent.name));
		expect(breadcrumbItem).toBeVisible();
		// choose button is disabled because active folder (opened folder) is same as set one
		expect(chooseButton).toBeVisible();
		expect(chooseButton).toHaveAttribute('disabled', '');
		await user.click(chooseButton);
		expect(confirmAction).not.toHaveBeenCalled();
		// select a valid folder
		await user.click(screen.getByText(folder.name));
		// choose button is active because folder is a valid selection
		await waitFor(() => expect(chooseButton).not.toHaveAttribute('disabled', ''));
		await user.click(chooseButton);
		expect(confirmAction).toHaveBeenCalled();
		expect(confirmAction).toHaveBeenCalledWith(
			expect.objectContaining({
				id: folder.id,
				name: folder.name
			}),
			true
		);
	});

	test('search in sub-folders is checked if cascade is true', async () => {
		const localRoot = populateLocalRoot();
		const mocks = [mockGetPath({ node_id: localRoot.id }, [localRoot])];
		setup(
			<div onClick={resetToDefault}>
				<FolderSelectionModalContent
					folderId={localRoot.id}
					confirmAction={confirmAction}
					cascadeDefault
				/>
			</div>,
			{
				mocks
			}
		);

		await screen.findByText(/home/i);
		const checkboxLabel = screen.getByText('search also in contained folders');
		expect(checkboxLabel).toBeVisible();
		const checkboxChecked = screen.getByTestId('icon: CheckmarkSquare');
		expect(checkboxChecked).toBeVisible();
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).toBeVisible();
		// choose button is disabled because active folder and cascade have same value as current filter
		expect(chooseButton).toHaveAttribute('disabled', '');
	});

	test('search in sub-folders check set cascade param', async () => {
		const localRoot = populateLocalRoot();
		const mocks = [mockGetPath({ node_id: localRoot.id }, [localRoot])];
		const { user } = setup(
			<div onClick={resetToDefault}>
				<FolderSelectionModalContent folderId={localRoot.id} confirmAction={confirmAction} />
			</div>,
			{
				mocks
			}
		);

		// wait a tick to let getPath query to be executed
		await waitFor(
			() =>
				new Promise((resolve) => {
					setTimeout(resolve, 0);
				})
		);
		await screen.findByText(/home/i);
		const checkboxLabel = screen.getByText('search also in contained folders');
		let checkboxChecked = screen.getByTestId('icon: CheckmarkSquare');
		expect(checkboxLabel).toBeVisible();
		expect(checkboxChecked).toBeVisible();
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).toBeVisible();
		// choose button is disabled because active folder and cascade have same value as current filter
		expect(chooseButton).toHaveAttribute('disabled', '');
		await user.click(checkboxLabel);
		const checkboxUnchecked = await screen.findByTestId('icon: Square');
		expect(checkboxUnchecked).toBeVisible();
		// choose button is active because cascade has changed its value
		expect(chooseButton).not.toHaveAttribute('disabled', '');
		await user.click(checkboxUnchecked);
		checkboxChecked = await screen.findByTestId('icon: CheckmarkSquare');
		expect(checkboxChecked).toBeVisible();
		// choose button is disabled because active folder and cascade have same value as current filter
		expect(chooseButton).toHaveAttribute('disabled', '');
		await user.click(checkboxChecked);
		await screen.findByTestId('icon: Square');
		await user.click(chooseButton);
		expect(confirmAction).toHaveBeenCalled();
		expect(confirmAction).toHaveBeenCalledWith(
			expect.objectContaining({
				id: localRoot.id,
				name: localRoot.name
			}),
			false
		);
	});

	test('shared with me roots is navigable. trash is not navigable. both are selectable', async () => {
		const sharedWithMeFilter = populateNodes(4);
		const mocks = [
			mockFindNodes(
				getFindNodesVariables({
					shared_with_me: true,
					cascade: true,
					direct_share: true,
					folder_id: ROOTS.LOCAL_ROOT
				}),
				sharedWithMeFilter
			)
		];
		const { getByTextWithMarkup, user } = setup(
			<div onClick={resetToDefault}>
				<FolderSelectionModalContent confirmAction={confirmAction} />
			</div>,
			{
				mocks
			}
		);

		await screen.findByText(/home/i);
		expect(screen.getByText(/shared with me/i)).toBeVisible();
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).toBeVisible();
		// choose button is disabled because entry point is not a valid selection
		expect(chooseButton).toHaveAttribute('disabled', '');
		await user.click(screen.getByText(/shared with me/i));
		// shared with me item is a valid selection
		await waitFor(() => expect(chooseButton).not.toHaveAttribute('disabled', ''));
		await user.click(chooseButton);
		expect(confirmAction).toHaveBeenCalled();
		expect(confirmAction).toHaveBeenCalledWith(
			expect.objectContaining({ id: ROOTS.SHARED_WITH_ME, name: 'Shared with me' }),
			true
		);
		// choose button is now disabled because of reset
		expect(chooseButton).toHaveAttribute('disabled', '');
		expect(screen.getByText(/trash/i)).toBeVisible();
		await user.click(screen.getByText(/trash/i));
		// trash item is a valid selection
		await waitFor(() => expect(chooseButton).not.toHaveAttribute('disabled', ''));
		await user.click(chooseButton);
		expect(confirmAction).toHaveBeenCalledTimes(2);
		expect(confirmAction).toHaveBeenLastCalledWith(
			expect.objectContaining({ id: ROOTS.TRASH, name: 'Trash' }),
			true
		);
		// choose button is now disabled because of reset
		expect(chooseButton).toHaveAttribute('disabled', '');
		await user.dblClick(screen.getByText(/trash/i));
		// double-click on trash does not trigger navigation
		expect(screen.getByText(/trash/i)).toBeVisible();
		expect(screen.getByText(/home/i)).toBeVisible();
		expect(screen.getByText(/shared with me/i)).toBeVisible();
		// choose button is now active because trash is the active item
		expect(chooseButton).not.toHaveAttribute('disabled', '');
		// ugly but it's the only way to check the item is visibly active
		expect(findStyled(screen.getByTestId(`node-item-${ROOTS.TRASH}`), HoverContainer)).toHaveStyle(
			'background-color: #d5e3f6'
		);
		await user.dblClick(screen.getByText(/shared with me/i));
		await screen.findByText(sharedWithMeFilter[0].name);
		expect(screen.getByText(sharedWithMeFilter[0].name)).toBeVisible();
		expect(getByTextWithMarkup(buildBreadCrumbRegExp('Files', 'Shared with me'))).toBeVisible();
		expect(chooseButton).not.toHaveAttribute('disabled', '');
		await user.click(chooseButton);
		expect(confirmAction).toHaveBeenCalledTimes(3);
		expect(confirmAction).toHaveBeenLastCalledWith(
			expect.objectContaining({ id: ROOTS.SHARED_WITH_ME, name: 'Shared with me' }),
			true
		);
	});

	test('confirm action is called with id and name after navigation of a folder inside a folder', async () => {
		const localRoot = populateLocalRoot(2);
		const folder = populateFolder(3);
		folder.parent = localRoot;
		localRoot.children.nodes.push(folder);
		const mocks = [
			mockGetChildren(getChildrenVariables(localRoot.id), localRoot),
			mockGetPath({ node_id: localRoot.id }, [localRoot]),
			mockGetChildren(getChildrenVariables(folder.id), folder),
			mockGetPath({ node_id: folder.id }, [localRoot, folder])
		];

		const { user } = setup(
			<div onClick={resetToDefault}>
				<FolderSelectionModalContent confirmAction={confirmAction} />
			</div>,
			{
				mocks
			}
		);
		await screen.findByText(/home/i);
		await user.dblClick(screen.getByText(/home/i));
		await screen.findByText(folder.name);
		expect(screen.getByText((localRoot.children.nodes[0] as Node).name)).toBeVisible();
		expect(screen.getByText(folder.name)).toBeVisible();
		await user.dblClick(screen.getByText(folder.name));
		await screen.findByText((folder.children.nodes[0] as Node).name);
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).not.toHaveAttribute('disabled', '');
		await user.click(chooseButton);
		expect(confirmAction).toHaveBeenCalled();
		expect(confirmAction).toHaveBeenLastCalledWith(
			expect.objectContaining({ id: folder.id, name: folder.name }),
			true
		);
	});

	test('confirm action is called with id and name after navigation of a folder inside a filter', async () => {
		const filter = populateNodes(2);
		const folder = populateFolder(3);
		filter.push(folder);
		const mocks = [
			mockFindNodes(
				getFindNodesVariables({
					shared_with_me: true,
					cascade: true,
					direct_share: true,
					folder_id: ROOTS.LOCAL_ROOT
				}),
				filter
			),
			mockGetChildren(getChildrenVariables(folder.id), folder),
			mockGetChild({ node_id: folder.id, shares_limit: 1 }, folder),
			mockGetPath({ node_id: folder.id }, [folder])
		];

		const { user } = setup(
			<div onClick={resetToDefault}>
				<FolderSelectionModalContent confirmAction={confirmAction} />
			</div>,
			{
				mocks
			}
		);
		await screen.findByText(/shared with me/i);
		await user.dblClick(screen.getByText(/shared with me/i));
		await screen.findByText(folder.name);
		expect(screen.getByText(filter[0].name)).toBeVisible();
		expect(screen.getByText(folder.name)).toBeVisible();
		await user.dblClick(screen.getByText(folder.name));
		await screen.findByText((folder.children.nodes[0] as Node).name);
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).not.toHaveAttribute('disabled', '');
		await user.click(chooseButton);
		expect(confirmAction).toHaveBeenCalled();
		expect(confirmAction).toHaveBeenLastCalledWith(
			expect.objectContaining({ id: folder.id, name: folder.name }),
			true
		);
	});
});
