/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { ApolloError } from '@apollo/client';
import { act, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { DropdownItem } from '@zextras/carbonio-design-system';
import { find } from 'lodash';

import { CreateOptionsContent } from '../../hooks/useCreateOptions';
import { NODES_LOAD_LIMIT, NODES_SORT_DEFAULT } from '../constants';
import { populateFolder, populateNodePage, populateNodes, sortNodes } from '../mocks/mockUtils';
import { Folder } from '../types/graphql/types';
import {
	getChildrenVariables,
	mockCreateFolder,
	mockCreateFolderError,
	mockGetChild,
	mockGetChildren,
	mockGetParent,
	mockGetPermissions
} from '../utils/mockUtils';
import { generateError, setup, triggerLoadMore, UserEvent } from '../utils/testUtils';
import { addNodeInSortedList } from '../utils/utils';
import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';

let mockedCreateOptions: CreateOptionsContent['createOptions'];

beforeEach(() => {
	mockedCreateOptions = [];
});

jest.mock('../../hooks/useCreateOptions', () => ({
	useCreateOptions: (): CreateOptionsContent => ({
		setCreateOptions: jest
			.fn()
			.mockImplementation((...options: Parameters<CreateOptionsContent['setCreateOptions']>[0]) => {
				mockedCreateOptions = options;
			}),
		removeCreateOptions: jest.fn()
	})
}));

jest.mock('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): JSX.Element => (
		<button
			data-testid="create-folder-test-id"
			onClick={(ev: React.MouseEvent<HTMLButtonElement>): void => {
				if (mockedCreateOptions) {
					const createFolder = mockedCreateOptions.find(
						(element) => element.id === 'create-folder'
					);
					if (createFolder) {
						const clickFn = (createFolder.action('target') as DropdownItem).onClick;
						clickFn && clickFn(ev);
					}
				}
			}}
		>
			{props.translationKey}:{props.icons}
		</button>
	)
}));

describe('Create folder', () => {
	async function createNode(newNode: { name: string }, user: UserEvent): Promise<void> {
		// wait for the creation modal to be opened
		const inputFieldDiv = await screen.findByTestId('input-name');
		const inputField = within(inputFieldDiv).getByRole('textbox');
		expect(inputField).toHaveValue('');
		await user.type(inputField, newNode.name);
		expect(inputField).toHaveValue(newNode.name);
		const button = screen.getByRole('button', { name: /create/i });
		await user.click(button);
	}

	test('Create folder operation fail shows an error in the modal and does not close it', async () => {
		const currentFolder = populateFolder();
		currentFolder.permissions.can_write_folder = true;
		const node1 = populateFolder(0, 'n1', 'first');
		const node2 = populateFolder(0, 'n2', 'second');
		const node3 = populateFolder(0, 'n3', 'third');
		currentFolder.children.nodes.push(node1, node2, node3);

		const newName = node2.name;

		const mocks = [
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
			mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
			mockGetChild({ node_id: currentFolder.id }, currentFolder),
			mockCreateFolderError(
				{
					destination_id: currentFolder.id,
					name: newName
				},
				new ApolloError({ graphQLErrors: [generateError('Error! Name already assigned')] })
			)
		];

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// wait for the load to be completed
		await waitForElementToBeRemoved(screen.queryByTestId('icon: Refresh'));
		expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);

		const createFolder = find(mockedCreateOptions, (option) => option.id === 'create-folder');
		expect(createFolder).toBeDefined();
		if (createFolder) {
			const createFolderElement = screen.getByTestId('create-folder-test-id');
			await user.click(createFolderElement);
		} else {
			fail();
		}

		await createNode(node2, user);
		await within(screen.getByTestId('modal')).findByText(/Error! Name already assigned/i);
		const error = within(screen.getByTestId('modal')).getByText(/Error! Name already assigned/i);
		expect(error).toBeInTheDocument();
		act(() => {
			// run timers of modal
			jest.runOnlyPendingTimers();
		});
		const inputFieldDiv = screen.getByTestId('input-name');
		const inputField = within(inputFieldDiv).getByRole('textbox');
		expect(inputField).toBeVisible();
		expect(inputField).toHaveValue(newName);
		expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);
	});

	test('Create folder add folder node at folder content, showing the element in the ordered list if neighbor is already loaded and ordered', async () => {
		const currentFolder = populateFolder();
		currentFolder.permissions.can_write_folder = true;
		const node1 = populateFolder(0, 'n1', 'first');
		const node2 = populateFolder(0, 'n2', 'second');
		const node3 = populateFolder(0, 'n3', 'third');
		// add node 1 and 3 as children, node 2 is the new folder
		currentFolder.children.nodes.push(node1, node3);

		const mocks = [
			mockGetParent({ node_id: currentFolder.id }, currentFolder),
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
			mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
			mockGetChild({ node_id: currentFolder.id }, currentFolder),
			mockCreateFolder(
				{
					destination_id: currentFolder.id,
					name: node2.name
				},
				node2
			)
		];

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// wait for the load to be completed
		await waitForElementToBeRemoved(screen.queryByTestId('icon: Refresh'));
		expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);

		const createFolder = find(mockedCreateOptions, (option) => option.id === 'create-folder');
		expect(createFolder).toBeDefined();
		if (createFolder) {
			const createFolderElement = screen.getByTestId('create-folder-test-id');
			await user.click(createFolderElement);
		} else {
			fail();
		}

		// create action
		await createNode(node2, user);
		await screen.findByTestId(`node-item-${node2.id}`);

		const nodeItem = await screen.findByTestId(`node-item-${node2.id}`);
		expect(screen.queryByTestId('input-name')).not.toBeInTheDocument();
		expect(nodeItem).toBeVisible();
		expect(within(nodeItem).getByText(node2.name)).toBeVisible();
		const nodes = screen.getAllByTestId('node-item', { exact: false });
		expect(nodes).toHaveLength(currentFolder.children.nodes.length + 1);
		expect(nodes[1]).toBe(nodeItem);
	});

	test('Create folder add folder node as last element of the list if neighbor is already loaded but unordered', async () => {
		const currentFolder = populateFolder();
		currentFolder.children = populateNodePage(populateNodes(NODES_LOAD_LIMIT, 'Folder'));
		sortNodes(currentFolder.children.nodes, NODES_SORT_DEFAULT);
		currentFolder.permissions.can_write_folder = true;
		const node1 = populateFolder(0, 'n1', `zzzz-new-folder-n1`);
		const node2 = populateFolder(0, 'n2', `zzzz-new-folder-n2`);
		const node3 = populateFolder(0, 'n3', `zzzz-new-folder-n3`);
		// 1) folder with more pages, just 1 loaded
		// 2) create node2 as unordered node3 (not loaded) as neighbor)
		// --> node2 should be last element of the list
		// 3) create node1 as unordered (node2 (loaded and unordered) as neighbor)
		// --> node1 should be put before node2 in the unordered
		// 4) trigger loadMore and load node1, node2, node3 with this order
		// --> list should be updated with the correct order

		const mocks = [
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
			mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
			mockGetChild({ node_id: currentFolder.id }, currentFolder),
			mockCreateFolder(
				{
					destination_id: currentFolder.id,
					name: node2.name
				},
				node2
			),
			mockCreateFolder(
				{
					destination_id: currentFolder.id,
					name: node1.name
				},
				node1
			),
			// fetchMore request, cursor is still last ordered node (last child of initial folder)
			mockGetChildren(
				getChildrenVariables(currentFolder.id, undefined, undefined, undefined, true),
				{
					...currentFolder,
					// second page contains the new created nodes and node3, not loaded before
					children: populateNodePage([node1, node2, node3])
				} as Folder
			)
		];

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// wait for the load to be completed
		await waitForElementToBeRemoved(screen.queryByTestId('icon: Refresh'));
		let nodes = screen.getAllByTestId('node-item', { exact: false });
		expect(nodes).toHaveLength(currentFolder.children.nodes.length);

		const createFolder = find(mockedCreateOptions, (option) => option.id === 'create-folder');
		expect(createFolder).toBeDefined();
		if (createFolder) {
			const createFolderElement = screen.getByTestId('create-folder-test-id');
			await user.click(createFolderElement);
		} else {
			fail();
		}

		// create action
		await createNode(node2, user);
		await screen.findByTestId(`node-item-${node2.id}`);
		expect(screen.getByText(node2.name)).toBeVisible();

		const node2Item = screen.getByTestId(`node-item-${node2.id}`);
		expect(screen.queryByTestId('input-name')).not.toBeInTheDocument();
		expect(node2Item).toBeVisible();
		expect(within(node2Item).getByText(node2.name)).toBeVisible();
		nodes = screen.getAllByTestId('node-item', { exact: false });
		expect(nodes).toHaveLength(currentFolder.children.nodes.length + 1);
		// node2 is last element of the list
		expect(nodes[nodes.length - 1]).toBe(node2Item);

		const createFolderElement = screen.getByTestId('create-folder-test-id');
		await user.click(createFolderElement);

		// create action
		await createNode(node1, user);
		await screen.findByTestId(`node-item-${node1.id}`);
		expect(screen.getByText(node1.name)).toBeVisible();

		expect(screen.queryByTestId('input-name')).not.toBeInTheDocument();
		const node1Item = screen.getByTestId(`node-item-${node1.id}`);
		expect(node1Item).toBeVisible();
		expect(within(node1Item).getByText(node1.name)).toBeVisible();
		nodes = screen.getAllByTestId('node-item', { exact: false });
		expect(nodes).toHaveLength(currentFolder.children.nodes.length + 2);
		// node1 is before node2 of the list
		expect(nodes[nodes.length - 2]).toBe(node1Item);
		// node2 is last element of the list
		expect(nodes[nodes.length - 1]).toBe(screen.getByTestId(`node-item-${node2.id}`));
		// trigger load more
		await triggerLoadMore();
		// wait for the load to be completed (node3 is now loaded)
		await screen.findByTestId(`node-item-${node3.id}`);
		nodes = screen.getAllByTestId('node-item', { exact: false });
		expect(nodes).toHaveLength(currentFolder.children.nodes.length + 3);
		// node1, node2 and node3 should have the correct order
		expect(screen.getByTestId(`node-item-${node1.id}`)).toBe(nodes[nodes.length - 3]);
		expect(screen.getByTestId(`node-item-${node2.id}`)).toBe(nodes[nodes.length - 2]);
		expect(screen.getByTestId(`node-item-${node3.id}`)).toBe(nodes[nodes.length - 1]);
	});

	test('Create folder that fill a page size does not trigger new page request', async () => {
		const currentFolder = populateFolder(NODES_LOAD_LIMIT - 1);
		currentFolder.permissions.can_write_folder = true;

		const newNode = populateFolder();

		let newPos = addNodeInSortedList(currentFolder.children.nodes, newNode, NODES_SORT_DEFAULT);
		newPos = newPos > -1 ? newPos : currentFolder.children.nodes.length;

		const mocks = [
			mockGetParent({ node_id: currentFolder.id }, currentFolder),
			mockGetChildren(getChildrenVariables(currentFolder.id), currentFolder),
			mockGetPermissions({ node_id: currentFolder.id }, currentFolder),
			mockGetChild({ node_id: currentFolder.id }, currentFolder),
			mockCreateFolder(
				{
					destination_id: currentFolder.id,
					name: newNode.name
				},
				newNode
			)
		];

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// wait for the load to be completed
		await waitForElementToBeRemoved(screen.queryByTestId('icon: Refresh'));
		expect(screen.getAllByTestId('node-item', { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);

		const createFolder = find(mockedCreateOptions, (option) => option.id === 'create-folder');
		expect(createFolder).toBeDefined();
		if (createFolder) {
			const createFolderElement = screen.getByTestId('create-folder-test-id');
			await user.click(createFolderElement);
		} else {
			fail();
		}

		// create action
		await createNode(newNode, user);
		await screen.findByTestId(`node-item-${newNode.id}`);
		expect(screen.getByText(newNode.name)).toBeVisible();
		const nodeItem = await screen.findByTestId(`node-item-${newNode.id}`);
		expect(screen.queryByTestId('input-name')).not.toBeInTheDocument();
		expect(nodeItem).toBeVisible();
		expect(within(nodeItem).getByText(newNode.name)).toBeVisible();
		const nodes = screen.getAllByTestId('node-item', { exact: false });
		expect(nodes).toHaveLength(NODES_LOAD_LIMIT);
		expect(nodes[newPos]).toBe(nodeItem);
		expect(screen.queryByTestId('icon: Refresh')).not.toBeInTheDocument();
	});
});
