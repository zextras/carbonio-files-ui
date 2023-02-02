/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { forEach } from 'lodash';
import { graphql } from 'msw';
import { Route } from 'react-router-dom';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import server from '../../mocks/server';
import { FILTER_TYPE, INTERNAL_PATH, NODES_LOAD_LIMIT, ROOTS } from '../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS } from '../constants/test';
import FIND_NODES from '../graphql/queries/findNodes.graphql';
import GET_NODE from '../graphql/queries/getNode.graphql';
import handleFindNodesRequest from '../mocks/handleFindNodesRequest';
import { populateNode, populateNodes } from '../mocks/mockUtils';
import { Node } from '../types/common';
import {
	FindNodesQuery,
	FindNodesQueryVariables,
	GetNodeQuery,
	GetNodeQueryVariables,
	NodeSort
} from '../types/graphql/types';
import { getFindNodesVariables, getNodeVariables, mockFindNodes } from '../utils/mockUtils';
import { selectNodes, setup } from '../utils/testUtils';
import FilterView from './FilterView';

const mockedRequestHandler = jest.fn();

beforeEach(() => {
	mockedRequestHandler.mockImplementation(handleFindNodesRequest);
	server.use(
		graphql.query<FindNodesQuery, FindNodesQueryVariables>('findNodes', mockedRequestHandler)
	);
});

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest.fn(),
		removeCreateOptions: jest.fn()
	})
}));

describe('Filter view', () => {
	describe('Trash filter', () => {
		test('Restore close the displayer from trash views', async () => {
			const { user } = setup(
				<Route path={`/:view/:filter?`}>
					<FilterView />
				</Route>,
				{
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
				}
			);
			// wait the content to be rendered
			await screen.findByText(/view files and folders/i);
			await screen.findAllByTestId('node-item', { exact: false });
			const queryResult = global.apolloClient.readQuery<FindNodesQuery, FindNodesQueryVariables>({
				query: FIND_NODES,
				variables: getFindNodesVariables({
					shared_with_me: false,
					folder_id: ROOTS.TRASH,
					cascade: false
				})
			});
			expect(queryResult?.findNodes?.nodes || null).not.toBeNull();
			const nodes = queryResult?.findNodes?.nodes as Node[];
			expect(nodes.length).toBeGreaterThan(0);
			const cachedNode = nodes[0];
			const node = populateNode(cachedNode.__typename, cachedNode.id, cachedNode.name);
			node.rootId = ROOTS.TRASH;
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
				query: GET_NODE,
				variables: getNodeVariables(node.id),
				data: {
					getNode: { ...node, description: '' }
				}
			});

			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId('displayer');
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			const restoreAction = within(displayer).getByTestId('icon: RestoreOutline');
			expect(restoreAction).toBeVisible();
			await user.click(restoreAction);
			await waitFor(() =>
				expect(screen.queryAllByTestId('node-item-', { exact: false })).toHaveLength(
					nodes.length - 1
				)
			);
			await screen.findByText(/^success$/i);
			await screen.findByText(/view files and folders/i);
			expect(within(displayer).queryByText(node.name)).not.toBeInTheDocument();
			expect(restoreAction).not.toBeInTheDocument();
			expect(
				screen.getByText(/View files and folders, share them with your contacts/i)
			).toBeVisible();
		});

		test('Delete permanently close the displayer from trash views', async () => {
			const { user } = setup(
				<Route path={`/:view/:filter?`}>
					<FilterView />
				</Route>,
				{
					initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
				}
			);
			// wait the content to be rendered
			await screen.findByText(/view files and folders/i);
			await screen.findAllByTestId('node-item', { exact: false });
			const queryResult = global.apolloClient.readQuery<FindNodesQuery, FindNodesQueryVariables>({
				query: FIND_NODES,
				variables: getFindNodesVariables({
					shared_with_me: false,
					folder_id: ROOTS.TRASH,
					cascade: false
				})
			});
			expect(queryResult?.findNodes?.nodes || null).not.toBeNull();
			const nodes = queryResult?.findNodes?.nodes as Node[];
			expect(nodes.length).toBeGreaterThan(0);
			const cachedNode = nodes[0];
			const node = populateNode(cachedNode.__typename, cachedNode.id, cachedNode.name);
			node.rootId = ROOTS.TRASH;
			node.permissions.can_write_file = true;
			node.permissions.can_write_folder = true;
			node.permissions.can_delete = true;
			global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
				query: GET_NODE,
				variables: getNodeVariables(node.id),
				data: {
					getNode: { ...node, description: '' }
				}
			});

			const nodeItem = screen.getByText(node.name);
			expect(nodeItem).toBeVisible();
			expect(screen.queryByText(/details/)).not.toBeInTheDocument();
			await user.click(nodeItem);
			await screen.findByText(/details/i);
			expect(screen.getByText(/details/i)).toBeVisible();
			const displayer = screen.getByTestId('displayer');
			expect(within(displayer).getAllByText(node.name)).toHaveLength(2);
			const deletePermanentlyAction = within(displayer).getByTestId(
				'icon: DeletePermanentlyOutline'
			);
			expect(deletePermanentlyAction).toBeVisible();
			await user.click(deletePermanentlyAction);
			const deletePermanentlyConfirm = await screen.findByRole('button', {
				name: ACTION_REGEXP.deletePermanently
			});
			await user.click(deletePermanentlyConfirm);
			await waitFor(() =>
				expect(screen.queryAllByTestId('node-item-', { exact: false })).toHaveLength(
					nodes.length - 1
				)
			);
			await screen.findByText(/^success$/i);
			await screen.findByText(/view files and folders/i);
			expect(deletePermanentlyConfirm).not.toBeInTheDocument();
			expect(within(displayer).queryByText(node.name)).not.toBeInTheDocument();
			expect(deletePermanentlyAction).not.toBeInTheDocument();
			expect(
				screen.getByText(/View files and folders, share them with your contacts/i)
			).toBeVisible();
		});

		test('in trash filter only restore and delete permanently actions are visible', async () => {
			const { user } = setup(
				<Route path={`/:view/:filter?`}>
					<FilterView />
				</Route>,
				{ initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`] }
			);
			// right click to open contextual menu
			await screen.findByText(/view files and folders/i);
			const nodeItems = await screen.findAllByTestId('node-item', { exact: false });
			fireEvent.contextMenu(nodeItems[0]);
			// check that restore action becomes visible
			const restoreAction = await screen.findByText(ACTION_REGEXP.restore);
			expect(restoreAction).toBeVisible();
			expect(screen.getByText(ACTION_REGEXP.deletePermanently)).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.flag)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.unflag)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.move)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.download)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.copy)).not.toBeInTheDocument();

			const queryResult = global.apolloClient.readQuery<FindNodesQuery, FindNodesQueryVariables>({
				query: FIND_NODES,
				variables: getFindNodesVariables({
					shared_with_me: false,
					folder_id: ROOTS.TRASH,
					cascade: false
				})
			});
			expect(queryResult?.findNodes?.nodes || null).not.toBeNull();
			const nodes = queryResult?.findNodes?.nodes as Node[];
			// selection mode
			await selectNodes([nodes[0].id], user);
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			expect(screen.queryByTestId('icon: MoreVertical')).not.toBeInTheDocument();
			const restoreActionSelection = await within(
				screen.getByTestId('list-header-selectionModeActive')
			).findByTestId('icon: RestoreOutline');
			expect(restoreActionSelection).toBeVisible();
			expect(
				within(screen.getByTestId('list-header-selectionModeActive')).getByTestId(
					'icon: DeletePermanentlyOutline'
				)
			).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.flag)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.unflag)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.move)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.download)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.copy)).not.toBeInTheDocument();
			// exit selection mode
			await user.click(screen.getByTestId('icon: ArrowBackOutline'));
			expect(restoreActionSelection).not.toBeInTheDocument();
			expect(screen.queryByTestId('icon: MoreVertical')).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();

			const node = populateNode(nodes[0].__typename, nodes[0].id, nodes[0].name);
			node.permissions.can_write_folder = true;
			node.permissions.can_write_file = true;
			node.permissions.can_delete = true;
			node.rootId = ROOTS.TRASH;
			global.apolloClient.writeQuery<GetNodeQuery, GetNodeQueryVariables>({
				query: GET_NODE,
				variables: getNodeVariables(node.id),
				data: {
					getNode: node
				}
			});

			// displayer
			await user.click(nodeItems[0]);
			await screen.findByText(/details/i);
			const displayer = screen.getByTestId('displayer');
			await within(displayer).findAllByText(nodes[0].name);
			expect(screen.queryByTestId('icon: MoreVertical')).not.toBeInTheDocument();
			expect(within(displayer).getByTestId('icon: RestoreOutline')).toBeVisible();
			expect(within(displayer).getByTestId('icon: DeletePermanentlyOutline')).toBeVisible();
			expect(screen.queryByText(ACTION_REGEXP.rename)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.flag)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.unflag)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.move)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.moveToTrash)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.download)).not.toBeInTheDocument();
			expect(screen.queryByText(ACTION_REGEXP.copy)).not.toBeInTheDocument();
		});

		test('if there is no element selected, trash actions are hidden', async () => {
			const nodes = populateNodes(10);
			forEach(nodes, (mockedNode) => {
				mockedNode.rootId = ROOTS.TRASH;
			});

			const mocks = [
				mockFindNodes(
					getFindNodesVariables({ folder_id: ROOTS.TRASH, cascade: false, shared_with_me: false }),
					nodes
				)
			];

			const { user } = setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				mocks,
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
			});
			await screen.findByText(nodes[0].name);
			expect(screen.getByText(nodes[0].name)).toBeVisible();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			await selectNodes([nodes[0].id], user);
			// check that all wanted items are selected
			expect(screen.getByTestId(SELECTORS.checkedAvatar)).toBeInTheDocument();
			expect(screen.getByText(/select all/i)).toBeVisible();
			// deselect node. Selection mode remains active
			await selectNodes([nodes[0].id], user);
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			expect(screen.getAllByTestId(SELECTORS.uncheckedAvatar)).toHaveLength(nodes.length);
			expect(screen.getByText(/select all/i)).toBeVisible();

			expect(screen.queryByTestId(ICON_REGEXP.moreVertical)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.restore)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.deletePermanently)).not.toBeInTheDocument();
			expect(screen.queryByTestId(ICON_REGEXP.moveToTrash)).not.toBeInTheDocument();

			expect(screen.getByTestId('icon: ArrowBackOutline')).toBeVisible();
			await user.click(screen.getByTestId('icon: ArrowBackOutline'));
			const listHeader = screen.getByTestId('list-header', { exact: false });
			expect(screen.queryByTestId('icon: ArrowBackOutline')).not.toBeInTheDocument();
			expect(within(listHeader).queryByTestId('icon: RestoreOutline')).not.toBeInTheDocument();
			expect(
				within(listHeader).queryByTestId('icon: DeletePermanentlyOutline')
			).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.uncheckedAvatar)).not.toBeInTheDocument();
			expect(screen.queryByTestId(SELECTORS.checkedAvatar)).not.toBeInTheDocument();
			expect(screen.queryByText(/select all/i)).not.toBeInTheDocument();
		});
	});

	describe('My Trash filter', () => {
		test('My Trash filter sharedWithMe=false and includes only trashed nodes', async () => {
			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.myTrash}`]
			});
			await screen.findByText(/view files and folders/i);
			const expectedVariables = {
				folder_id: ROOTS.TRASH,
				cascade: false,
				shared_with_me: false,
				sort: NodeSort.NameAsc,
				limit: NODES_LOAD_LIMIT,
				shares_limit: 1
			};
			expect(mockedRequestHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					variables: expectedVariables
				}),
				expect.anything(),
				expect.anything()
			);
			expect(screen.queryByTestId('missing-filter')).not.toBeInTheDocument();
		});
	});

	describe('Shared Trash filter', () => {
		test('Shared trash filter has sharedWithMe=true and includes only trashed nodes', async () => {
			setup(<Route path={`/:view/:filter?`} component={FilterView} />, {
				initialRouterEntries: [`${INTERNAL_PATH.FILTER}${FILTER_TYPE.sharedTrash}`]
			});
			await screen.findByText(/view files and folders/i);
			const expectedVariables = {
				folder_id: ROOTS.TRASH,
				cascade: false,
				shared_with_me: true,
				sort: NodeSort.NameAsc,
				limit: NODES_LOAD_LIMIT,
				shares_limit: 1
			};
			expect(mockedRequestHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					variables: expectedVariables
				}),
				expect.anything(),
				expect.anything()
			);
			expect(screen.queryByTestId('missing-filter')).not.toBeInTheDocument();
		});
	});
});
