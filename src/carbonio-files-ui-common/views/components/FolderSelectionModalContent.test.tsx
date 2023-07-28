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

import { FolderSelectionModalContent } from './FolderSelectionModalContent';
import { HoverContainer } from './StyledComponents';
import { destinationVar } from '../../apollo/destinationVar';
import { ROOTS } from '../../constants';
import { COLORS, ICON_REGEXP, SELECTORS } from '../../constants/test';
import {
	populateFile,
	populateFolder,
	populateLocalRoot,
	populateNodePage,
	populateNodes,
	populateParents
} from '../../mocks/mockUtils';
import { Resolvers } from '../../types/graphql/resolvers-types';
import { Node } from '../../types/graphql/types';
import { mockFindNodes, mockGetNode, mockGetPath } from '../../utils/resolverMocks';
import { buildBreadCrumbRegExp, setup } from '../../utils/testUtils';

let confirmAction = jest.fn();
let resetToDefault = jest.fn();

beforeEach(() => {
	confirmAction = jest.fn(() => {
		// clone implementation of the function contained in the close callback of useCopyContent
		destinationVar({ defaultValue: undefined, currentValue: undefined });
	});
	resetToDefault = jest.fn(() => {
		// clone implementation of the function contained in the click callback of useCopyContent
		destinationVar({ ...destinationVar(), currentValue: destinationVar().defaultValue });
	});
});

describe('Folder Selection Modal Content', () => {
	test('show roots if no folder is set. Choose button is disabled', async () => {
		const { user } = setup(
			<div onClick={resetToDefault}>
				<FolderSelectionModalContent confirmAction={confirmAction} />
			</div>,
			{
				mocks: {}
			}
		);

		await screen.findByText(/home/i);
		expect(screen.getByText('Home')).toBeVisible();
		expect(screen.getByText('Shared with me')).toBeVisible();
		expect(screen.getByText('Trash')).toBeVisible();
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).toBeVisible();
		expect(chooseButton).toBeDisabled();
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

		const mocks = {
			Query: {
				getPath: mockGetPath([...path, folder], path),
				getNode: mockGetNode(parent)
			}
		} satisfies Partial<Resolvers>;

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
		// expect(screen.getByTestId(SELECTORS.nodeItem(file.id))).toHaveAttribute('disabled', '');
		// expect(screen.getByTestId(SELECTORS.nodeItem(folder.id))).not.toHaveAttribute('disabled', '');
		// expect(screen.getByTestId(SELECTORS.nodeItem(folder2.id))).not.toHaveAttribute('disabled', '');
		// choose button is disabled because active folder is same as set one
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).toBeVisible();
		expect(chooseButton).toBeDisabled();
		await user.click(chooseButton);
		expect(confirmAction).not.toHaveBeenCalled();
		// click on disabled choose button should leave the button disabled
		expect(chooseButton).toBeDisabled();
		// click on disabled node set opened folder as active
		await user.click(screen.getByText(file.name));
		// choose button becomes active. Opened folder is a valid selection
		await waitFor(() => expect(chooseButton).toBeEnabled());
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
		expect(chooseButton).toBeDisabled();
		// click on other folder
		await user.click(screen.getByText(folder2.name));
		// choose button becomes active. Other folder is a valid selection
		await waitFor(() => expect(chooseButton).toBeEnabled());
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
		expect(chooseButton).toBeDisabled();
		// click on other folder
		await user.click(screen.getByText(folder2.name));
		// choose button becomes active. Other folder is a valid selection
		await waitFor(() => expect(chooseButton).toBeEnabled());
		// click on set folder
		await user.click(screen.getByText(folder.name));
		// choose button becomes disabled. Folder already set in advanced params is not a valid selection
		await waitFor(() => expect(chooseButton).toBeDisabled());
	});

	test('root items are valid, roots entry point is not valid', async () => {
		const localRoot = populateFolder(2, ROOTS.LOCAL_ROOT);

		const mocks = {
			Query: {
				getPath: mockGetPath([localRoot]),
				getNode: mockGetNode(localRoot)
			}
		} satisfies Partial<Resolvers>;

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
		expect(
			findStyled(screen.getByTestId(SELECTORS.nodeItem(localRoot.id)), HoverContainer)
		).toHaveStyle({ 'background-color': COLORS.highlight.regular });
		expect(screen.getByText(/shared with me/i)).toBeVisible();
		expect(screen.getByText(/trash/i)).toBeVisible();
		// choose button is disabled because active folder is same as set one
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).toBeVisible();
		expect(chooseButton).toBeDisabled();
		// click on other root
		await user.click(screen.getByText(/shared with me/i));
		await waitFor(() => expect(chooseButton).toBeEnabled());
		// active root is become the clicked root
		expect(
			findStyled(screen.getByTestId(SELECTORS.nodeItem(ROOTS.SHARED_WITH_ME)), HoverContainer)
		).toHaveStyle({ 'background-color': COLORS.highlight.regular });
		expect(
			findStyled(screen.getByTestId(SELECTORS.nodeItem(localRoot.id)), HoverContainer)
		).not.toHaveStyle({ 'background-color': COLORS.highlight.regular });
		// click on subtitle to reset active folder
		await user.click(screen.getByText(/searched only inside the selected folder/i));
		// choose button becomes disabled because the root list entry point is not a valid selection
		await waitFor(() => expect(chooseButton).toBeDisabled());
		await user.click(chooseButton);
		expect(confirmAction).not.toHaveBeenCalled();
	});

	test('navigation through breadcrumb reset active folder', async () => {
		const localRoot = populateFolder(2, ROOTS.LOCAL_ROOT);
		const folder = populateFolder();
		localRoot.children.nodes.push(folder);
		folder.parent = localRoot;

		const mocks = {
			Query: {
				getPath: jest.fn(() => [localRoot]),
				getNode: mockGetNode(localRoot)
			}
		} satisfies Partial<Resolvers>;

		const { findByTextWithMarkup, user } = setup(
			<div onClick={resetToDefault}>
				<FolderSelectionModalContent folderId={localRoot.id} confirmAction={confirmAction} />
			</div>,
			{
				mocks
			}
		);

		await screen.findByText(/home/i);
		await waitFor(() => expect(mocks.Query.getPath).toHaveBeenCalled());
		let breadcrumbItem = await findByTextWithMarkup(buildBreadCrumbRegExp('Files'));
		expect(breadcrumbItem).toBeVisible();
		expect(screen.getByText(/home/i)).toBeVisible();
		// ugly but it's the only way to check the item is visibly active
		expect(
			findStyled(screen.getByTestId(SELECTORS.nodeItem(localRoot.id)), HoverContainer)
		).toHaveStyle({ 'background-color': COLORS.highlight.regular });
		await user.dblClick(screen.getByText(/home/i));
		await screen.findByText(folder.name);
		expect(screen.getByText(folder.name)).toBeVisible();
		expect(screen.getByText((localRoot.children.nodes[0] as Node).name)).toBeVisible();
		breadcrumbItem = await findByTextWithMarkup(buildBreadCrumbRegExp('Files', folder.parent.name));
		expect(breadcrumbItem).toBeVisible();
		// choose button is disabled because active folder (opened folder) is same as set one
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).toBeVisible();
		expect(chooseButton).toBeDisabled();
		// navigate back to the roots list through breadcrumb
		await user.click(screen.getByText('Files'));
		// wait roots list to be rendered
		await screen.findByText(/shared with me/i);
		expect(screen.queryByText(folder.name)).not.toBeInTheDocument();
		// choose button is disabled because is now referring the entry point, which is not valid
		expect(chooseButton).toBeDisabled();
		// local root item is not visibly active
		expect(
			findStyled(screen.getByTestId(SELECTORS.nodeItem(localRoot.id)), HoverContainer)
		).not.toHaveStyle(expect.objectContaining({ 'background-color': COLORS.highlight.regular }));
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
		expect(chooseButton).toBeDisabled();
		await user.click(chooseButton);
		expect(confirmAction).not.toHaveBeenCalled();
		// select a valid folder
		await user.click(screen.getByText(folder.name));
		// choose button is active because folder is a valid selection
		await waitFor(() => expect(chooseButton).toBeEnabled());
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
		const mocks = {
			Query: {
				getPath: mockGetPath([localRoot])
			}
		} satisfies Partial<Resolvers>;
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
		const checkboxChecked = screen.getByTestId(ICON_REGEXP.checkboxChecked);
		expect(checkboxChecked).toBeVisible();
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).toBeVisible();
		// choose button is disabled because active folder and cascade have same value as current filter
		expect(chooseButton).toBeDisabled();
	});

	test('search in sub-folders check set cascade param', async () => {
		const localRoot = populateLocalRoot();
		const mocks = {
			Query: {
				getPath: mockGetPath([localRoot])
			}
		} satisfies Partial<Resolvers>;
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
		let checkboxChecked = screen.getByTestId(ICON_REGEXP.checkboxChecked);
		expect(checkboxLabel).toBeVisible();
		expect(checkboxChecked).toBeVisible();
		const chooseButton = screen.getByRole('button', { name: /choose folder/i });
		expect(chooseButton).toBeVisible();
		// choose button is disabled because active folder and cascade have same value as current filter
		expect(chooseButton).toBeDisabled();
		await user.click(checkboxLabel);
		const checkboxUnchecked = await screen.findByTestId(ICON_REGEXP.checkboxUnchecked);
		expect(checkboxUnchecked).toBeVisible();
		// choose button is active because cascade has changed its value
		expect(chooseButton).toBeEnabled();
		await user.click(checkboxUnchecked);
		checkboxChecked = await screen.findByTestId(ICON_REGEXP.checkboxChecked);
		expect(checkboxChecked).toBeVisible();
		// choose button is disabled because active folder and cascade have same value as current filter
		expect(chooseButton).toBeDisabled();
		await user.click(checkboxChecked);
		await screen.findByTestId(ICON_REGEXP.checkboxUnchecked);
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
		const mocks = {
			Query: {
				findNodes: mockFindNodes(sharedWithMeFilter)
			}
		} satisfies Partial<Resolvers>;
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
		expect(chooseButton).toBeDisabled();
		await user.click(screen.getByText(/shared with me/i));
		// shared with me item is a valid selection
		await waitFor(() => expect(chooseButton).toBeEnabled());
		await user.click(chooseButton);
		expect(confirmAction).toHaveBeenCalled();
		expect(confirmAction).toHaveBeenCalledWith(
			expect.objectContaining({ id: ROOTS.SHARED_WITH_ME, name: 'Shared with me' }),
			true
		);
		// choose button is now disabled because of reset
		expect(chooseButton).toBeDisabled();
		expect(screen.getByText(/trash/i)).toBeVisible();
		await user.click(screen.getByText(/trash/i));
		// trash item is a valid selection
		await waitFor(() => expect(chooseButton).toBeEnabled());
		await user.click(chooseButton);
		expect(confirmAction).toHaveBeenCalledTimes(2);
		expect(confirmAction).toHaveBeenLastCalledWith(
			expect.objectContaining({ id: ROOTS.TRASH, name: 'Trash' }),
			true
		);
		// choose button is now disabled because of reset
		expect(chooseButton).toBeDisabled();
		await user.dblClick(screen.getByText(/trash/i));
		// double-click on trash does not trigger navigation
		expect(screen.getByText(/trash/i)).toBeVisible();
		expect(screen.getByText(/home/i)).toBeVisible();
		expect(screen.getByText(/shared with me/i)).toBeVisible();
		// choose button is now active because trash is the active item
		expect(chooseButton).toBeEnabled();
		// ugly but it's the only way to check the item is visibly active
		expect(
			findStyled(screen.getByTestId(SELECTORS.nodeItem(ROOTS.TRASH)), HoverContainer)
		).toHaveStyle({
			'background-color': COLORS.highlight.regular
		});
		await user.dblClick(screen.getByText(/shared with me/i));
		await screen.findByText(sharedWithMeFilter[0].name);
		expect(screen.getByText(sharedWithMeFilter[0].name)).toBeVisible();
		expect(getByTextWithMarkup(buildBreadCrumbRegExp('Files', 'Shared with me'))).toBeVisible();
		expect(chooseButton).toBeEnabled();
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
		const mocks = {
			Query: {
				getPath: mockGetPath([localRoot], [localRoot, folder]),
				getNode: mockGetNode(localRoot, folder)
			}
		} satisfies Partial<Resolvers>;

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
		expect(chooseButton).toBeEnabled();
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
		const mocks = {
			Query: {
				findNodes: mockFindNodes(filter),
				getPath: mockGetPath([folder]),
				getNode: mockGetNode(folder)
			}
		} satisfies Partial<Resolvers>;

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
		expect(chooseButton).toBeEnabled();
		await user.click(chooseButton);
		expect(confirmAction).toHaveBeenCalled();
		expect(confirmAction).toHaveBeenLastCalledWith(
			expect.objectContaining({ id: folder.id, name: folder.name }),
			true
		);
	});
});
