/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { DropdownItem } from '@zextras/carbonio-design-system';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import { ACTION_IDS } from '../../constants';
import { CreateOption } from '../../hooks/useCreateOptions';
import { NODES_LOAD_LIMIT, NODES_SORT_DEFAULT } from '../constants';
import { ICON_REGEXP, SELECTORS } from '../constants/test';
import { populateFolder, populateNodePage, populateNodes, sortNodes } from '../mocks/mockUtils';
import { FolderResolvers, Resolvers } from '../types/graphql/resolvers-types';
import {
	mockCreateFolder,
	mockErrorResolver,
	mockGetNode,
	mockGetPath
} from '../utils/resolverMocks';
import {
	generateError,
	setup,
	spyOnUseCreateOptions,
	triggerListLoadMore,
	UserEvent
} from '../utils/testUtils';
import { addNodeInSortedList } from '../utils/utils';

const MockDisplayer = (props: DisplayerProps): React.JSX.Element => (
	<div>
		{props.translationKey}:{props.icons}
	</div>
);

jest.mock<typeof import('./components/Displayer')>('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): React.JSX.Element => <MockDisplayer {...props} />
}));

async function createNode(newNode: { name: string }, user: UserEvent): Promise<void> {
	// wait for the creation modal to be opened
	const inputField = screen.getByRole('textbox');
	expect(inputField).toHaveValue('');
	await user.type(inputField, newNode.name);
	expect(inputField).toHaveValue(newNode.name);
	const button = screen.getByRole('button', { name: /^create$/i });
	await user.click(button);
}

function findCreateFolderOption(createOptions: CreateOption[]): DropdownItem | undefined {
	return createOptions.find((option) => option.id === ACTION_IDS.CREATE_FOLDER)?.action(undefined);
}

describe('Create folder', () => {
	test('Create folder operation fail shows an error in the modal and does not close it', async () => {
		const currentFolder = populateFolder();
		currentFolder.permissions.can_write_folder = true;
		const node1 = populateFolder(0, 'n1', 'first');
		const node2 = populateFolder(0, 'n2', 'second');
		const node3 = populateFolder(0, 'n3', 'third');
		currentFolder.children.nodes.push(node1, node2, node3);
		const newName = node2.name;
		const createOptions: CreateOption[] = [];
		spyOnUseCreateOptions(createOptions);
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({
					getChildren: [currentFolder],
					getPermissions: [currentFolder]
				})
			},
			Mutation: {
				createFolder: mockErrorResolver(generateError('Error! Name already assigned'))
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// wait for the load to be completed
		await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);
		const createFolder = findCreateFolderOption(createOptions);
		act(() => {
			createFolder?.onClick?.(new KeyboardEvent('keyup'));
		});
		await createNode(node2, user);
		await within(screen.getByTestId(SELECTORS.modal)).findByText(/Error! Name already assigned/i);
		const error = within(screen.getByTestId(SELECTORS.modal)).getByText(
			/Error! Name already assigned/i
		);
		expect(error).toBeInTheDocument();
		act(() => {
			// run timers of modal
			jest.runOnlyPendingTimers();
		});
		const inputField = screen.getByRole('textbox');
		expect(inputField).toBeVisible();
		expect(inputField).toHaveValue(newName);
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
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
		const createOptions: CreateOption[] = [];
		spyOnUseCreateOptions(createOptions);
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({
					getChildren: [currentFolder],
					getPermissions: [currentFolder]
				})
			},
			Mutation: {
				createFolder: mockCreateFolder(node2)
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// wait for the load to be completed
		await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);
		const createFolder = findCreateFolderOption(createOptions);
		act(() => {
			createFolder?.onClick?.(new KeyboardEvent('keyup'));
		});
		// create action
		await createNode(node2, user);
		await screen.findByTestId(SELECTORS.nodeItem(node2.id));

		const nodeItem = await screen.findByTestId(SELECTORS.nodeItem(node2.id));
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
		expect(nodeItem).toBeVisible();
		expect(within(nodeItem).getByText(node2.name)).toBeVisible();
		const nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
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
		const createOptions: CreateOption[] = [];
		spyOnUseCreateOptions(createOptions);
		// 1) folder with more pages, just 1 loaded
		// 2) create node2 as unordered node3 (not loaded) as neighbor)
		// --> node2 should be last element of the list
		// 3) create node1 as unordered (node2 (loaded and unordered) as neighbor)
		// --> node1 should be put before node2 in the unordered
		// 4) trigger loadMore and load node1, node2, node3 with this order
		// --> list should be updated with the correct order

		const childrenResolver: FolderResolvers['children'] = (parent, args) =>
			args.page_token === 'page2'
				? populateNodePage([node1, node2, node3])
				: populateNodePage(currentFolder.children.nodes, NODES_LOAD_LIMIT, 'page2');
		const mocks = {
			Folder: {
				children: childrenResolver
			},
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({
					getChildren: [currentFolder, currentFolder],
					getPermissions: [currentFolder]
				})
			},
			Mutation: {
				createFolder: mockCreateFolder(node2, node1)
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// wait for the load to be completed
		const listHeader = screen.getByTestId(SELECTORS.listHeader);
		await waitForElementToBeRemoved(within(listHeader).queryByTestId(ICON_REGEXP.queryLoading));
		let nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
		expect(nodes).toHaveLength(currentFolder.children.nodes.length);

		const createFolder = findCreateFolderOption(createOptions);
		act(() => {
			createFolder?.onClick?.(new KeyboardEvent('keyup'));
		});

		// create action
		await createNode(node2, user);
		await screen.findByTestId(SELECTORS.nodeItem(node2.id));
		expect(screen.getByText(node2.name)).toBeVisible();

		const node2Item = screen.getByTestId(SELECTORS.nodeItem(node2.id));
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

		expect(node2Item).toBeVisible();
		expect(within(node2Item).getByText(node2.name)).toBeVisible();
		nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
		expect(nodes).toHaveLength(currentFolder.children.nodes.length + 1);
		// node2 is last element of the list
		expect(nodes[nodes.length - 1]).toBe(node2Item);
		act(() => {
			createFolder?.onClick?.(new KeyboardEvent('keyup'));
		});
		// create action
		await createNode(node1, user);
		await screen.findByTestId(SELECTORS.nodeItem(node1.id));
		expect(screen.getByText(node1.name)).toBeVisible();
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
		const node1Item = screen.getByTestId(SELECTORS.nodeItem(node1.id));
		expect(node1Item).toBeVisible();
		expect(within(node1Item).getByText(node1.name)).toBeVisible();
		nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
		expect(nodes).toHaveLength(currentFolder.children.nodes.length + 2);
		// node1 is before node2 of the list
		expect(nodes[nodes.length - 2]).toBe(node1Item);
		// node2 is last element of the list
		expect(nodes[nodes.length - 1]).toBe(screen.getByTestId(SELECTORS.nodeItem(node2.id)));
		// trigger load more
		triggerListLoadMore();
		// wait for the load to be completed (node3 is now loaded)
		await screen.findByTestId(SELECTORS.nodeItem(node3.id));
		nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
		expect(nodes).toHaveLength(currentFolder.children.nodes.length + 3);
		// node1, node2 and node3 should have the correct order
		expect(screen.getByTestId(SELECTORS.nodeItem(node1.id))).toBe(nodes[nodes.length - 3]);
		expect(screen.getByTestId(SELECTORS.nodeItem(node2.id))).toBe(nodes[nodes.length - 2]);
		expect(screen.getByTestId(SELECTORS.nodeItem(node3.id))).toBe(nodes[nodes.length - 1]);
	});

	test('Create folder that fill a page size does not trigger new page request', async () => {
		const currentFolder = populateFolder(NODES_LOAD_LIMIT - 1);
		currentFolder.permissions.can_write_folder = true;
		const newNode = populateFolder();
		let newPos = addNodeInSortedList(currentFolder.children.nodes, newNode, NODES_SORT_DEFAULT);
		newPos = newPos > -1 ? newPos : currentFolder.children.nodes.length;
		const createOptions: CreateOption[] = [];
		spyOnUseCreateOptions(createOptions);
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] })
			},
			Mutation: {
				createFolder: mockCreateFolder(newNode)
			}
		} satisfies Partial<Resolvers>;

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// wait for the load to be completed
		await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);
		const createFolder = findCreateFolderOption(createOptions);
		act(() => {
			createFolder?.onClick?.(new KeyboardEvent('keyup'));
		});
		// create action
		await createNode(newNode, user);
		await screen.findByTestId(SELECTORS.nodeItem(newNode.id));
		expect(screen.getByText(newNode.name)).toBeVisible();
		const nodeItem = await screen.findByTestId(SELECTORS.nodeItem(newNode.id));
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
		expect(nodeItem).toBeVisible();
		expect(within(nodeItem).getByText(newNode.name)).toBeVisible();
		const nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
		expect(nodes).toHaveLength(NODES_LOAD_LIMIT);
		expect(nodes[newPos]).toBe(nodeItem);
		expect(screen.queryByTestId(ICON_REGEXP.queryLoading)).not.toBeInTheDocument();
	});
});
