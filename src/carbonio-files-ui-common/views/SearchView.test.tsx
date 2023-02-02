/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { fireEvent, screen, within } from '@testing-library/react';
import { map, find } from 'lodash';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import { searchParamsVar } from '../apollo/searchVar';
import { INTERNAL_PATH, ROOTS } from '../constants';
import { ACTION_REGEXP } from '../constants/test';
import BASE_NODE from '../graphql/fragments/baseNode.graphql';
import {
	populateFolder,
	populateNode,
	populateNodes,
	populateParents,
	populatePermissions,
	populateShares
} from '../mocks/mockUtils';
import { AdvancedFilters, Node } from '../types/common';
import { BaseNodeFragment, Folder, NodeType, SharedTarget } from '../types/graphql/types';
import {
	getChildrenVariables,
	getFindNodesVariables,
	getNodeVariables,
	getSharesVariables,
	mockDeleteShare,
	mockFindNodes,
	mockGetChild,
	mockGetChildren,
	mockGetNode,
	mockGetNodeCollaborationLinks,
	mockGetNodeLinks,
	mockGetPath,
	mockGetShares,
	mockMoveNodes,
	mockRestoreNodes,
	mockTrashNodes
} from '../utils/mockUtils';
import { buildBreadCrumbRegExp, buildChipsFromKeywords, moveNode, setup } from '../utils/testUtils';
import { getChipLabel } from '../utils/utils';
import { SearchView } from './SearchView';

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest.fn(),
		removeCreateOptions: jest.fn()
	})
}));

describe('Search view', () => {
	describe('Shared by me param', () => {
		test('Deletion of all collaborators does not remove node from list. Displayer is kept open', async () => {
			const searchParams: AdvancedFilters = { sharedByMe: { label: 'shared', value: true } };
			searchParamsVar(searchParams);
			const nodes = populateNodes(2);
			const nodeWithShares = populateNode();
			const shares = populateShares(nodeWithShares, 2);
			nodeWithShares.shares = shares;
			nodeWithShares.permissions.can_share = true;
			nodes.push(nodeWithShares);
			const mocks = [
				mockFindNodes(getFindNodesVariables({ shared_by_me: true, keywords: [] }), nodes),
				mockGetNode(getNodeVariables(nodeWithShares.id), nodeWithShares),
				mockGetShares(getSharesVariables(nodeWithShares.id), nodeWithShares),
				mockGetNodeLinks({ node_id: nodeWithShares.id }, nodeWithShares),
				mockGetNodeCollaborationLinks({ node_id: nodeWithShares.id }, nodeWithShares),
				mockDeleteShare(
					{
						node_id: nodeWithShares.id,
						share_target_id: (shares[0].share_target as SharedTarget).id
					},
					true
				),
				mockDeleteShare(
					{
						node_id: nodeWithShares.id,
						share_target_id: (shares[1].share_target as SharedTarget).id
					},
					true
				),
				mockFindNodes(getFindNodesVariables({ shared_by_me: true, keywords: [] }), nodes)
			];

			const { user } = setup(<SearchView />, {
				initialRouterEntries: [`${INTERNAL_PATH.SEARCH}/?node=${nodeWithShares.id}&tab=sharing`],
				mocks
			});
			// render of the list
			await screen.findByText(nodes[0].name);
			// render of the displayer
			await screen.findByText(/sharing/i);
			// render of the sharing tab
			await screen.findByText(/collaborators/i);
			// render of the collaborators
			await screen.findByText(getChipLabel(shares[0].share_target));
			// there should be 2 chips for collaborators
			const chipItems = screen.getAllByTestId('chip-with-popover');
			expect(chipItems).toHaveLength(2);
			const share1Item = find(
				chipItems,
				(chipItem) => within(chipItem).queryByText(getChipLabel(shares[0].share_target)) !== null
			);
			const share2Item = find(
				chipItems,
				(chipItem) => within(chipItem).queryByText(getChipLabel(shares[1].share_target)) !== null
			);
			const nodeItem = screen.getByTestId(`node-item-${nodeWithShares.id}`);
			expect(nodeItem).toBeVisible();
			expect(within(nodeItem).getByTestId('icon: ArrowCircleRight')).toBeVisible();
			expect(share1Item).toBeDefined();
			expect(share2Item).toBeDefined();
			expect(share1Item).toBeVisible();
			expect(share2Item).toBeVisible();
			const list = screen.getByTestId('list-');
			// delete first share
			await user.click(within(share1Item as HTMLElement).getByTestId('icon: Close'));
			await screen.findByRole('button', { name: /remove/i });
			await user.click(screen.getByRole('button', { name: /remove/i }));
			expect(screen.queryByText(getChipLabel(shares[0].share_target))).not.toBeInTheDocument();
			await screen.findByText(/success/i);
			expect(share2Item).toBeVisible();
			expect(within(list).getByText(nodeWithShares.name)).toBeVisible();
			// delete second share
			await user.click(within(share2Item as HTMLElement).getByTestId('icon: Close'));
			await screen.findByRole('button', { name: /remove/i });
			await user.click(screen.getByRole('button', { name: /remove/i }));
			expect(screen.queryByText(getChipLabel(shares[1].share_target))).not.toBeInTheDocument();
			await screen.findByText(/success/i);
			// node is kept in main list but share icon is removed
			expect(nodeItem).toBeVisible();
			expect(within(nodeItem).queryByTestId('icon: ArrowCircleRight')).not.toBeInTheDocument();
			// displayer remains open
			expect(within(screen.getByTestId('displayer')).getByText(nodeWithShares.name)).toBeVisible();
			expect(screen.getByText(/sharing/i)).toBeVisible();
			expect(screen.getByText(/collaborators/i)).toBeVisible();
		});
	});

	describe('Displayer', () => {
		test('Single click on a node opens the details tab on displayer. Close displayer action keeps search view visible', async () => {
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
			searchParamsVar(searchParams);
			const currentSearch = populateNodes(2);
			// prepare cache so that apollo client read data from the cache

			const mocks = [
				mockFindNodes(getFindNodesVariables({ keywords }), currentSearch),
				mockGetNode(getNodeVariables(currentSearch[0].id), currentSearch[0] as Node)
			];

			const { getByTextWithMarkup, user } = setup(<SearchView />, {
				initialRouterEntries: [INTERNAL_PATH.SEARCH],
				mocks
			});
			expect(screen.queryByText('Previous view')).not.toBeInTheDocument();
			const nodeItem = await screen.findByText(currentSearch[0].name);
			expect(nodeItem).toBeVisible();
			const displayer = screen.getByTestId('displayer');
			expect(within(displayer).queryByText(/details/i)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(within(displayer).getAllByText(currentSearch[0].name)).toHaveLength(2);
			expect(getByTextWithMarkup(buildBreadCrumbRegExp(currentSearch[0].name))).toBeVisible();
			const closeDisplayerAction = within(screen.getByTestId('DisplayerHeader')).getByTestId(
				'icon: Close'
			);
			expect(closeDisplayerAction).toBeVisible();
			await user.click(closeDisplayerAction);
			expect(within(displayer).queryByText(/details/i)).not.toBeInTheDocument();
			expect(screen.getByText(currentSearch[0].name)).toBeVisible();
			await screen.findByText(/view files and folders/i);
			expect.assertions(8);
		});

		test('Move action does not close the displayer if node is not removed from the main list', async () => {
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
			searchParamsVar(searchParams);

			const nodes = populateNodes(2);
			const node = nodes[0];
			node.parent = populateFolder();
			const { path: parentPath } = populateParents(node.parent);
			const destinationFolder = populateFolder();
			destinationFolder.permissions.can_write_folder = true;
			destinationFolder.permissions.can_write_file = true;
			(node.parent as Folder).children.nodes.push(destinationFolder);
			(node.parent as Folder).permissions.can_write_folder = true;
			(node.parent as Folder).permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.flagged = true;
			const path = [...parentPath, node];
			const pathUpdated = [...parentPath, destinationFolder, node];
			const pathResponse = [path, pathUpdated];

			const mocks = [
				mockFindNodes(getFindNodesVariables({ keywords }), nodes),
				mockGetNode(getNodeVariables(node.id), node as Node),
				mockGetNode(getNodeVariables(node.parent.id), node.parent as Folder),
				mockGetNode(getNodeVariables(destinationFolder.id), destinationFolder),
				mockGetPath({ node_id: node.id }, pathResponse[0]),
				mockGetPath({ node_id: node.id }, pathResponse[1]),
				mockGetPath({ node_id: node.parent.id }, parentPath),
				mockGetPath({ node_id: destinationFolder.id }, [...parentPath, destinationFolder]),
				mockGetChildren(getChildrenVariables(node.parent.id), node.parent),
				mockGetChild({ node_id: node.parent.id, shares_limit: 1 }, node.parent),
				mockMoveNodes({ node_ids: [node.id], destination_id: destinationFolder.id }, [node])
			];

			const { getByTextWithMarkup, queryByTextWithMarkup, findByTextWithMarkup, user } = setup(
				<SearchView />,
				{
					initialRouterEntries: [INTERNAL_PATH.SEARCH],
					mocks
				}
			);

			// wait the content to be rendered
			await screen.findAllByTestId('node-item', { exact: false });
			expect(nodes).not.toBeNull();
			expect(nodes.length).toBeGreaterThan(0);
			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId('displayer');
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			expect(getByTextWithMarkup(buildBreadCrumbRegExp(node.name))).toBeVisible();
			const showPathButton = screen.getByRole('button', { name: /show path/i });
			expect(showPathButton).toBeVisible();
			await user.click(showPathButton);
			const fullPathOrig = await findByTextWithMarkup(
				buildBreadCrumbRegExp(...map(path, (parent) => parent.name))
			);
			expect(fullPathOrig).toBeVisible();
			// right click to open contextual menu
			const nodeToMoveItem = screen.getByTestId(`node-item-${node.id}`);
			fireEvent.contextMenu(nodeToMoveItem);
			await moveNode(destinationFolder, user);
			jest.advanceTimersToNextTimer();
			const fullPath = await findByTextWithMarkup(
				buildBreadCrumbRegExp(...map(pathUpdated, (parent) => parent.name))
			);
			await screen.findByText(/item moved/i);
			// old breadcrumb is not visible anymore
			expect(
				queryByTextWithMarkup(buildBreadCrumbRegExp(...map([...path], (parent) => parent.name)))
			).not.toBeInTheDocument();
			// updated breadcrumb is visible instead
			expect(fullPath).toBeVisible();
			expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(nodes.length);
			expect(within(screen.getByTestId('list-')).getByText(node.name)).toBeVisible();
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
		});

		test('Mark for deletion does not close the displayer from searches without trashed nodes', async () => {
			const keywords = ['keyword1', 'keyword2'];
			const folder = populateFolder();
			const searchParams: AdvancedFilters = {
				keywords: buildChipsFromKeywords(keywords),
				folderId: { label: folder.name, value: folder.id },
				cascade: { value: true }
			};
			searchParamsVar(searchParams);

			const nodes = populateNodes(2);
			const node = nodes[0];
			node.parent = populateFolder();
			node.parent.permissions.can_write_folder = true;
			node.parent.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.permissions.can_delete = true;

			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ keywords, folder_id: folder.id, cascade: true }),
					nodes
				),
				mockGetNode(getNodeVariables(node.id), node as Node),
				mockGetNode(getNodeVariables(node.parent.id), node.parent as Folder),
				mockTrashNodes({ node_ids: [node.id] }, [node.id])
			];

			const { user } = setup(<SearchView />, {
				initialRouterEntries: [INTERNAL_PATH.SEARCH],
				mocks
			});

			// wait the content to be rendered
			await screen.findAllByTestId('node-item', { exact: false });
			expect(nodes).not.toBeNull();
			expect(nodes.length).toBeGreaterThan(0);
			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId('displayer');
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			// right click to open contextual menu
			const nodeToTrashItem = screen.getByTestId(`node-item-${node.id}`);
			fireEvent.contextMenu(nodeToTrashItem);
			const moveToTrashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(moveToTrashAction).toBeVisible();
			await user.click(moveToTrashAction);
			// await snackbar to be shown
			await screen.findByText(/item moved to trash/i);
			expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(nodes.length);
			expect(within(screen.getByTestId('list-')).getByText(node.name)).toBeVisible();
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			const trashedNodeItem = screen.getByTestId(`node-item-${node.id}`);
			expect(trashedNodeItem).toBeVisible();
			fireEvent.contextMenu(trashedNodeItem);
			await screen.findByText(ACTION_REGEXP.restore);
			expect(screen.getByText(ACTION_REGEXP.restore)).toBeVisible();
			expect(screen.getByText(ACTION_REGEXP.deletePermanently)).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
		});

		test('Mark for deletion does not close the displayer from searches with nodes both marked for deletion and not', async () => {
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
			searchParamsVar(searchParams);

			const nodes = populateNodes(2);
			const node = nodes[0];
			node.parent = populateFolder();
			node.parent.permissions.can_write_folder = true;
			node.parent.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.permissions.can_delete = true;

			const mocks = [
				mockFindNodes(getFindNodesVariables({ keywords }), nodes),
				mockGetNode(getNodeVariables(node.id), node as Node),
				mockGetNode(getNodeVariables(node.parent.id), node.parent as Folder),
				mockTrashNodes({ node_ids: [node.id] }, [node.id])
			];

			const { user } = setup(<SearchView />, {
				initialRouterEntries: [INTERNAL_PATH.SEARCH],
				mocks
			});

			// wait the content to be rendered
			await screen.findAllByTestId('node-item', { exact: false });
			expect(nodes).not.toBeNull();
			expect(nodes.length).toBeGreaterThan(0);
			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId('displayer');
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			// right click to open contextual menu
			const nodeToTrashItem = screen.getByTestId(`node-item-${node.id}`);
			fireEvent.contextMenu(nodeToTrashItem);
			const moveToTrashAction = await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(moveToTrashAction).toBeVisible();
			await user.click(moveToTrashAction);
			// await snackbar to be shown
			await screen.findByText(/item moved to trash/i);
			expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(nodes.length);
			expect(within(screen.getByTestId('list-')).getByText(node.name)).toBeVisible();
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			const trashedNodeItem = screen.getByTestId(`node-item-${node.id}`);
			expect(trashedNodeItem).toBeVisible();
			fireEvent.contextMenu(trashedNodeItem);
			await screen.findByText(ACTION_REGEXP.restore);
			expect(screen.getByText(ACTION_REGEXP.restore)).toBeVisible();
			expect(screen.getByText(ACTION_REGEXP.deletePermanently)).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
		});

		test('Restore does not close the displayer from searches with only trashed nodes', async () => {
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = {
				keywords: buildChipsFromKeywords(keywords),
				folderId: { label: 'Trash', value: ROOTS.TRASH }
			};
			searchParamsVar(searchParams);

			const nodes = populateNodes(2);
			const node = nodes[0];
			node.parent = populateFolder();
			node.parent.permissions.can_write_folder = true;
			node.parent.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.rootId = ROOTS.TRASH;

			global.apolloClient.writeFragment<BaseNodeFragment>({
				fragment: BASE_NODE,
				fragmentName: 'BaseNode',
				data: {
					__typename: 'Folder',
					id: ROOTS.LOCAL_ROOT,
					name: ROOTS.LOCAL_ROOT,
					type: NodeType.Root,
					rootId: null,
					flagged: false,
					permissions: populatePermissions(true)
				}
			});

			const mocks = [
				mockFindNodes(getFindNodesVariables({ keywords, folder_id: ROOTS.TRASH }), nodes),
				mockGetNode(getNodeVariables(node.id), node as Node),
				mockGetNode(getNodeVariables(node.parent.id), node.parent as Folder),
				mockRestoreNodes({ node_ids: [node.id] }, [{ ...node, rootId: ROOTS.LOCAL_ROOT }])
			];

			const { user } = setup(<SearchView />, {
				initialRouterEntries: [INTERNAL_PATH.SEARCH],
				mocks
			});

			// wait the content to be rendered
			await screen.findAllByTestId('node-item', { exact: false });
			expect(nodes).not.toBeNull();
			expect(nodes.length).toBeGreaterThan(0);
			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId('displayer');
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			// right click to open contextual menu
			const nodeToRestoreItem = screen.getByTestId(`node-item-${node.id}`);
			fireEvent.contextMenu(nodeToRestoreItem);
			const restoreAction = await screen.findByText(ACTION_REGEXP.restore);
			expect(restoreAction).toBeVisible();
			expect(restoreAction.parentNode).not.toHaveAttribute('disabled', '');
			await user.click(restoreAction);
			// await snackbar to be shown
			await screen.findByText(/^success$/i);
			expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(nodes.length);
			expect(within(screen.getByTestId('list-')).getByText(node.name)).toBeVisible();
			expect(within(screen.getByTestId('displayer')).getAllByText(node.name)).toHaveLength(2);
			const restoredNodeItem = screen.getByTestId(`node-item-${node.id}`);
			expect(restoredNodeItem).toBeVisible();
			fireEvent.contextMenu(restoredNodeItem);
			await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(screen.getByText(ACTION_REGEXP.moveToTrash)).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.deletePermanently)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.restore)).not.toBeInTheDocument();
		});

		test('Restore does not close the displayer from searches with nodes both marked for deletion and not', async () => {
			const keywords = ['keyword1', 'keyword2'];
			const searchParams: AdvancedFilters = { keywords: buildChipsFromKeywords(keywords) };
			searchParamsVar(searchParams);

			const nodes = populateNodes(2);
			const node = nodes[0];
			node.parent = populateFolder();
			node.parent.permissions.can_write_folder = true;
			node.parent.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.rootId = ROOTS.TRASH;

			global.apolloClient.writeFragment<BaseNodeFragment>({
				fragment: BASE_NODE,
				fragmentName: 'BaseNode',
				data: {
					__typename: 'Folder',
					id: ROOTS.LOCAL_ROOT,
					name: ROOTS.LOCAL_ROOT,
					type: NodeType.Root,
					rootId: null,
					flagged: false,
					permissions: populatePermissions(true)
				}
			});

			const mocks = [
				mockFindNodes(getFindNodesVariables({ keywords }), nodes),
				mockGetNode(getNodeVariables(node.id), node as Node),
				mockGetNode(getNodeVariables(node.parent.id), node.parent as Folder),
				mockRestoreNodes({ node_ids: [node.id] }, [{ ...node, rootId: ROOTS.LOCAL_ROOT }])
			];

			const { user } = setup(<SearchView />, {
				initialRouterEntries: [INTERNAL_PATH.SEARCH],
				mocks
			});

			// wait the content to be rendered
			await screen.findAllByTestId('node-item', { exact: false });
			expect(nodes).not.toBeNull();
			expect(nodes.length).toBeGreaterThan(0);
			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId('displayer');
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			// right click to open contextual menu
			const nodeToRestoreItem = screen.getByTestId(`node-item-${node.id}`);
			fireEvent.contextMenu(nodeToRestoreItem);
			const restoreAction = await screen.findByText(ACTION_REGEXP.restore);
			expect(restoreAction).toBeVisible();
			expect(restoreAction.parentNode).not.toHaveAttribute('disabled', '');
			await user.click(restoreAction);
			// await snackbar to be shown
			await screen.findByText(/^success$/i);
			expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(nodes.length);
			expect(within(screen.getByTestId('list-')).getByText(node.name)).toBeVisible();
			expect(within(screen.getByTestId('displayer')).getAllByText(node.name)).toHaveLength(2);
			const restoredNodeItem = screen.getByTestId(`node-item-${node.id}`);
			expect(restoredNodeItem).toBeVisible();
			fireEvent.contextMenu(restoredNodeItem);
			await screen.findByText(ACTION_REGEXP.moveToTrash);
			expect(screen.getByText(ACTION_REGEXP.moveToTrash)).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.deletePermanently)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.restore)).not.toBeInTheDocument();
		});
	});
});
