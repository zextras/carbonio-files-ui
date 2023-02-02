/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { fireEvent, screen, within } from '@testing-library/react';
import { forEach, map } from 'lodash';
import { Route } from 'react-router-dom';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import { FILTER_TYPE, INTERNAL_PATH, ROOTS } from '../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../constants/test';
import GET_CHILDREN from '../graphql/queries/getChildren.graphql';
import {
	populateFile,
	populateFolder,
	populateNodePage,
	populateNodes,
	populateParents
} from '../mocks/mockUtils';
import { Folder, GetChildrenQuery, GetChildrenQueryVariables } from '../types/graphql/types';
import {
	getChildrenVariables,
	getFindNodesVariables,
	mockCopyNodes,
	mockFindNodes,
	mockGetChildren,
	mockGetPath
} from '../utils/mockUtils';
import { buildBreadCrumbRegExp, selectNodes, setup } from '../utils/testUtils';
import FilterView from './FilterView';

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest.fn(),
		removeCreateOptions: jest.fn()
	})
}));

describe('Filter View', () => {
	describe('Copy', () => {
		describe('Selection Mode', () => {
			test('Copy is enabled when multiple files are selected', async () => {
				const currentFilter = [];
				const file = populateFile();
				file.parent = populateFolder();
				const folder = populateFolder();
				folder.parent = populateFolder();
				currentFilter.push(file, folder);

				const mocks = [
					mockFindNodes(
						getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
						currentFilter
					)
				];

				const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
					mocks,
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`]
				});

				await screen.findByText(file.name);
				await selectNodes([file.id, folder.id], user);

				// check that all wanted items are selected
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(2);

				const copyAction = await screen.findByTestId(ICON_REGEXP.copy);
				expect(copyAction).toBeVisible();
				expect(copyAction).not.toHaveAttribute('disabled', '');
			});

			test('Copy open modal showing parent folder content. Confirm action close the modal and clear cached data for destination folder', async () => {
				const currentFilter = populateNodes(5);
				const destinationFolder = populateFolder();
				destinationFolder.permissions.can_write_folder = true;
				destinationFolder.permissions.can_write_file = true;
				currentFilter.push(destinationFolder);
				const { node: nodeToCopy, path } = populateParents(currentFilter[0], 2, true);
				const parentFolder = nodeToCopy.parent as Folder;
				parentFolder.children = populateNodePage([nodeToCopy, destinationFolder]);

				// write destination folder in cache as if it was already loaded
				global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
					query: GET_CHILDREN,
					variables: getChildrenVariables(destinationFolder.id),
					data: {
						getNode: destinationFolder
					}
				});
				const mocks = [
					mockFindNodes(
						getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
						currentFilter
					),
					mockGetPath({ node_id: parentFolder.id }, path.slice(0, path.length - 1)),
					mockGetChildren(getChildrenVariables(parentFolder.id), parentFolder),
					mockCopyNodes(
						{
							node_ids: [nodeToCopy.id],
							destination_id: destinationFolder.id
						},
						[{ ...nodeToCopy, parent: destinationFolder }]
					)
				];

				const { getByTextWithMarkup, findByTextWithMarkup, user } = setup(
					<Route path={`/:view/:filter?`} component={FilterView} />,
					{ mocks, initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`] }
				);

				await screen.findByText(nodeToCopy.name);

				let destinationFolderCachedData = global.apolloClient.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GET_CHILDREN,
					variables: getChildrenVariables(destinationFolder.id)
				});

				expect(destinationFolderCachedData?.getNode || null).not.toBeNull();
				expect((destinationFolderCachedData?.getNode as Folder).id).toBe(destinationFolder.id);

				// activate selection mode by selecting items
				await selectNodes([nodeToCopy.id], user);
				// check that all wanted items are selected
				expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();

				let copyAction = screen.queryByTestId(ICON_REGEXP.copy);
				if (!copyAction) {
					const moreAction = await screen.findByTestId(ICON_REGEXP.moreVertical);
					await user.click(moreAction);
					copyAction = await screen.findByText(ACTION_REGEXP.copy);
				}
				expect(copyAction).toBeVisible();
				await user.click(copyAction);

				const modalList = await screen.findByTestId(`modal-list-${parentFolder.id}`);
				const destinationFolderItem = await within(modalList).findByText(destinationFolder.name);
				const breadcrumbRegexp = buildBreadCrumbRegExp(
					'Files',
					...map(path.slice(0, path.length - 1), (node) => node.name)
				);
				await findByTextWithMarkup(buildBreadCrumbRegExp(path[0].name));
				expect(getByTextWithMarkup(breadcrumbRegexp)).toBeVisible();

				await user.click(destinationFolderItem);
				expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).not.toHaveAttribute(
					'disabled',
					''
				);
				await user.click(screen.getByRole('button', { name: ACTION_REGEXP.copy }));
				expect(screen.queryByTestId('modal-list', { exact: false })).not.toBeInTheDocument();
				await screen.findByText(/item copied/i);

				expect(screen.queryByRole('button', { name: ACTION_REGEXP.copy })).not.toBeInTheDocument();
				// exit selection mode
				expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

				expect(screen.queryAllByTestId('node-item', { exact: false })).toHaveLength(
					currentFilter.length
				);

				destinationFolderCachedData = global.apolloClient.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GET_CHILDREN,
					variables: getChildrenVariables(destinationFolder.id)
				});

				expect(destinationFolderCachedData).toBeNull();
			});

			test('Copy for multiple nodes with same parent open modal showing parent folder content. Confirm action close the modal and clear cached data for destination folder', async () => {
				const currentFilter = populateNodes(5);
				const parentFolder = populateFolder(2);
				const destinationFolder = populateFolder();
				destinationFolder.permissions.can_write_folder = true;
				destinationFolder.permissions.can_write_file = true;
				destinationFolder.parent = parentFolder;
				const nodesToCopy = currentFilter.slice(0, 2);
				forEach(nodesToCopy, (mockedNode) => {
					mockedNode.parent = parentFolder;
				});
				parentFolder.children.nodes.push(destinationFolder, ...nodesToCopy);

				// write destination folder in cache as if it was already loaded
				global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
					query: GET_CHILDREN,
					variables: getChildrenVariables(destinationFolder.id),
					data: {
						getNode: destinationFolder
					}
				});

				const mocks = [
					mockFindNodes(
						getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
						currentFilter
					),
					mockGetPath({ node_id: parentFolder.id }, [parentFolder]),
					mockGetChildren(getChildrenVariables(parentFolder.id), parentFolder),
					mockCopyNodes(
						{
							node_ids: map(nodesToCopy, (node) => node.id),
							destination_id: destinationFolder.id
						},
						map(nodesToCopy, (node) => ({ ...node, parent: destinationFolder }))
					)
				];

				const { findByTextWithMarkup, user } = setup(
					<Route path={`/:view/:filter?`} component={FilterView} />,
					{ mocks, initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`] }
				);

				await screen.findByText(nodesToCopy[0].name);

				let destinationFolderCachedData = global.apolloClient.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GET_CHILDREN,
					variables: getChildrenVariables(destinationFolder.id)
				});

				expect(destinationFolderCachedData?.getNode || null).not.toBeNull();
				expect((destinationFolderCachedData?.getNode as Folder).id).toBe(destinationFolder.id);

				// activate selection mode by selecting items
				await selectNodes(
					map(nodesToCopy, (node) => node.id),
					user
				);
				// check that all wanted items are selected
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodesToCopy.length);
				const copyAction = await screen.findByTestId(ICON_REGEXP.copy);
				expect(copyAction).toBeVisible();
				await user.click(copyAction);

				const modalList = await screen.findByTestId(`modal-list-${parentFolder.id}`);
				const destinationFolderItem = await within(modalList).findByText(destinationFolder.name);
				const breadcrumbRegexp = buildBreadCrumbRegExp(parentFolder.name);
				const breadcrumb = await findByTextWithMarkup(breadcrumbRegexp);
				expect(breadcrumb).toBeVisible();

				await user.click(destinationFolderItem);
				expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).not.toHaveAttribute(
					'disabled',
					''
				);
				await user.click(screen.getByRole('button', { name: ACTION_REGEXP.copy }));
				expect(screen.queryByTestId('modal-list', { exact: false })).not.toBeInTheDocument();
				await screen.findByText(/item copied/i);

				expect(screen.queryByRole('button', { name: ACTION_REGEXP.copy })).not.toBeInTheDocument();
				// exit selection mode
				expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

				expect(screen.queryAllByTestId('node-item', { exact: false })).toHaveLength(
					currentFilter.length
				);

				destinationFolderCachedData = global.apolloClient.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GET_CHILDREN,
					variables: getChildrenVariables(destinationFolder.id)
				});

				expect(destinationFolderCachedData).toBeNull();
			});

			test('Copy for multiple nodes with different parents open modal showing roots. Confirm action close the modal and clear cached data for destination folder', async () => {
				const currentFilter = populateNodes(5);
				const localRoot = populateFolder(2, ROOTS.LOCAL_ROOT, 'Home');
				const destinationFolder = populateFolder();
				destinationFolder.permissions.can_write_folder = true;
				destinationFolder.permissions.can_write_file = true;
				localRoot.children.nodes.push(destinationFolder);
				const nodesToCopy = currentFilter.slice(0, 2);
				forEach(nodesToCopy, (mockedNode) => {
					mockedNode.parent = populateFolder();
				});

				// write destination folder in cache as if it was already loaded
				global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
					query: GET_CHILDREN,
					variables: getChildrenVariables(destinationFolder.id),
					data: {
						getNode: destinationFolder
					}
				});

				const mocks = [
					mockFindNodes(
						getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
						currentFilter
					),
					mockGetChildren(getChildrenVariables(localRoot.id), localRoot),
					mockCopyNodes(
						{
							node_ids: map(nodesToCopy, (node) => node.id),
							destination_id: destinationFolder.id
						},
						map(nodesToCopy, (node) => ({ ...node, parent: destinationFolder }))
					),
					mockGetPath({ node_id: localRoot.id }, [localRoot])
				];

				const { getByTextWithMarkup, user } = setup(
					<Route path={`/:view/:filter?`} component={FilterView} />,
					{ mocks, initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`] }
				);

				await screen.findByText(nodesToCopy[0].name);

				let destinationFolderCachedData = global.apolloClient.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GET_CHILDREN,
					variables: getChildrenVariables(destinationFolder.id)
				});

				expect(destinationFolderCachedData?.getNode || null).not.toBeNull();
				expect((destinationFolderCachedData?.getNode as Folder).id).toBe(destinationFolder.id);

				// activate selection mode by selecting items
				await selectNodes(
					map(nodesToCopy, (node) => node.id),
					user
				);
				// check that all wanted items are selected
				expect(screen.getAllByTestId(SELECTORS.checkedAvatar)).toHaveLength(nodesToCopy.length);
				let copyAction = screen.queryByTestId(ICON_REGEXP.copy);
				if (!copyAction) {
					const moreAction = await screen.findByTestId(ICON_REGEXP.moreVertical);
					await user.click(moreAction);
					copyAction = await screen.findByText(ACTION_REGEXP.copy);
				}
				await user.click(copyAction);

				// open modal with roots
				let modalList = await screen.findByTestId('modal-list-roots');
				expect(within(modalList).getByText('Shared with me')).toBeInTheDocument();
				expect(within(modalList).getByText(localRoot.name)).toBeInTheDocument();
				expect(within(modalList).queryByText('Trash')).not.toBeInTheDocument();
				expect(getByTextWithMarkup(buildBreadCrumbRegExp('Files'))).toBeInTheDocument();
				expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).toHaveAttribute(
					'disabled',
					''
				);

				await user.dblClick(within(modalList).getByText(localRoot.name));

				modalList = await screen.findByTestId(`modal-list-${localRoot.id}`);
				const destinationFolderItem = await within(modalList).findByText(destinationFolder.name);

				await user.click(destinationFolderItem);
				expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).not.toHaveAttribute(
					'disabled',
					''
				);
				await user.click(screen.getByRole('button', { name: ACTION_REGEXP.copy }));
				expect(screen.queryByTestId('modal-list', { exact: false })).not.toBeInTheDocument();
				await screen.findByText(/item copied/i);

				expect(screen.queryByRole('button', { name: ACTION_REGEXP.copy })).not.toBeInTheDocument();
				// exit selection mode
				expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

				expect(screen.queryAllByTestId('node-item', { exact: false })).toHaveLength(
					currentFilter.length
				);

				destinationFolderCachedData = global.apolloClient.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GET_CHILDREN,
					variables: getChildrenVariables(destinationFolder.id)
				});

				expect(destinationFolderCachedData).toBeNull();
			});
		});

		describe('Contextual Menu', () => {
			test('Copy open modal showing parent folder content. Confirm action close the modal and clear cached data for destination folder', async () => {
				const currentFilter = populateNodes(5);
				const destinationFolder = populateFolder();
				destinationFolder.permissions.can_write_folder = true;
				destinationFolder.permissions.can_write_file = true;
				currentFilter.push(destinationFolder);
				const { node: nodeToCopy, path } = populateParents(currentFilter[0], 2, true);
				const parentFolder = nodeToCopy.parent as Folder;
				parentFolder.children = populateNodePage([nodeToCopy, destinationFolder]);

				// write destination folder in cache as if it was already loaded
				global.apolloClient.writeQuery<GetChildrenQuery, GetChildrenQueryVariables>({
					query: GET_CHILDREN,
					variables: getChildrenVariables(destinationFolder.id),
					data: {
						getNode: destinationFolder
					}
				});
				const mocks = [
					mockFindNodes(
						getFindNodesVariables({ flagged: true, folder_id: ROOTS.LOCAL_ROOT, cascade: true }),
						currentFilter
					),
					mockGetPath({ node_id: parentFolder.id }, path.slice(0, path.length - 1)),
					mockGetChildren(getChildrenVariables(parentFolder.id), parentFolder),
					mockCopyNodes(
						{
							node_ids: [nodeToCopy.id],
							destination_id: destinationFolder.id
						},
						[{ ...nodeToCopy, parent: destinationFolder }]
					)
				];

				const { getByTextWithMarkup, findByTextWithMarkup, user } = setup(
					<Route path={`/:view/:filter?`} component={FilterView} />,
					{ mocks, initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.flagged}`] }
				);

				await screen.findByText(nodeToCopy.name);

				let destinationFolderCachedData = global.apolloClient.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GET_CHILDREN,
					variables: getChildrenVariables(destinationFolder.id)
				});

				expect(destinationFolderCachedData?.getNode || null).not.toBeNull();
				expect((destinationFolderCachedData?.getNode as Folder).id).toBe(destinationFolder.id);

				// right click to open contextual menu on folder
				const nodeToCopyItem = await screen.findByText(nodeToCopy.name);
				fireEvent.contextMenu(nodeToCopyItem);
				const copyAction = await screen.findByText(ACTION_REGEXP.copy);
				expect(copyAction).toBeVisible();
				await user.click(copyAction);

				const modalList = await screen.findByTestId(`modal-list-${parentFolder.id}`);
				const destinationFolderItem = await within(modalList).findByText(destinationFolder.name);
				const breadcrumbRegexp = buildBreadCrumbRegExp(
					'Files',
					...map(path.slice(0, path.length - 1), (node) => node.name)
				);
				await findByTextWithMarkup(breadcrumbRegexp);
				expect(getByTextWithMarkup(breadcrumbRegexp)).toBeVisible();

				await user.click(destinationFolderItem);
				expect(screen.getByRole('button', { name: ACTION_REGEXP.copy })).not.toHaveAttribute(
					'disabled',
					''
				);
				await user.click(screen.getByRole('button', { name: ACTION_REGEXP.copy }));
				expect(screen.queryByTestId('modal-list', { exact: false })).not.toBeInTheDocument();
				await screen.findByText(/item copied/i);

				expect(screen.queryByRole('button', { name: ACTION_REGEXP.copy })).not.toBeInTheDocument();
				// context menu is closed
				expect(screen.queryByText(ACTION_REGEXP.copy)).not.toBeInTheDocument();

				expect(screen.queryAllByTestId('node-item', { exact: false })).toHaveLength(
					currentFilter.length
				);

				destinationFolderCachedData = global.apolloClient.readQuery<
					GetChildrenQuery,
					GetChildrenQueryVariables
				>({
					query: GET_CHILDREN,
					variables: getChildrenVariables(destinationFolder.id)
				});

				expect(destinationFolderCachedData).toBeNull();
			});
		});
	});
});
