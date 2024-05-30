/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import { ACTION_IDS } from '../../constants';
import { CreateOption } from '../../hooks/useCreateOptions';
import server from '../../mocks/server';
import {
	CREATE_FILE_PATH,
	DOCS_ENDPOINT,
	NODES_LOAD_LIMIT,
	NODES_SORT_DEFAULT,
	HTTP_STATUS_CODE
} from '../constants';
import { ICON_REGEXP, LIST_EMPTY_MESSAGE, SELECTORS, TIMERS } from '../constants/test';
import { CreateDocsFileRequestBody, CreateDocsFileResponse } from '../hooks/useCreateDocsFile';
import {
	populateFile,
	populateFolder,
	populateNodePage,
	populateNodes,
	sortNodes
} from '../mocks/mockUtils';
import { setup, spyOnCreateOptions, triggerLoadMore, UserEvent } from '../tests/utils';
import { FolderResolvers, Resolvers } from '../types/graphql/resolvers-types';
import { ValueOf } from '../types/utils';
import { mockGetPath, mockGetNode } from '../utils/resolverMocks';

const MockDisplayer = (props: DisplayerProps): React.JSX.Element => (
	<div>
		{props.translationKey}:{props.icons}
	</div>
);

jest.mock<typeof import('./components/Displayer')>('./components/Displayer', () => ({
	Displayer: (props: DisplayerProps): React.JSX.Element => <MockDisplayer {...props} />
}));

function clickOnCreateDocsAction(
	createOptions: CreateOption[],
	action: ValueOf<typeof ACTION_IDS>,
	docType: 'libre' | 'ms'
): void {
	const mainItem = createOptions.find((item) => item.id === action);
	const subItems = mainItem?.action(undefined)?.items;
	const subItem = subItems?.find((item) => item.id === `${action}-${docType}`);
	act(() => {
		subItem?.onClick?.(new KeyboardEvent(''));
	});
}

async function createNode(newNode: { name: string }, user: UserEvent): Promise<void> {
	// wait for the creation modal to be opened
	const inputField = screen.getByRole('textbox');
	expect(inputField).toHaveValue('');
	await user.type(inputField, newNode.name);
	expect(inputField).toHaveValue(newNode.name);
	const button = screen.getByRole('button', { name: /^create$/i });
	await user.click(button);
}

describe('Create docs file', () => {
	test('Create docs file operation fail shows an error in the modal and does not close it', async () => {
		const currentFolder = populateFolder();
		currentFolder.permissions.can_write_file = true;
		const node1 = populateFile('n1', 'first');
		const node2 = populateFile('n2', 'second');
		const node3 = populateFile('n3', 'third');
		currentFolder.children.nodes.push(node1, node2, node3);

		const newName = node2.name;

		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({
					getChildren: [currentFolder],
					getPermissions: [currentFolder],
					getNode: [node2]
				})
			}
		} satisfies Partial<Resolvers>;

		server.use(
			http.post(`${DOCS_ENDPOINT}${CREATE_FILE_PATH}`, () =>
				HttpResponse.json(null, { status: 500, statusText: 'Error! Name already assigned' })
			)
		);

		const createOptions = spyOnCreateOptions();

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// wait for the load to be completed
		await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);
		clickOnCreateDocsAction(createOptions, ACTION_IDS.CREATE_DOCS_DOCUMENT, 'libre');
		await createNode(node2, user);
		const error = await within(screen.getByTestId(SELECTORS.modal)).findByText(
			/Error! Name already assigned/
		);
		expect(error).toBeInTheDocument();
		const inputField = screen.getByRole('textbox');
		expect(inputField).toBeInTheDocument();
		expect(inputField).toHaveValue(newName);
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);
	});

	test('Create docs add file node at folder content, showing the element in the ordered list if neighbor is already loaded and ordered', async () => {
		const currentFolder = populateFolder();
		currentFolder.permissions.can_write_file = true;
		const node1 = populateFile('n1', 'first');
		const node2 = populateFile('n2', 'second');
		node2.parent = currentFolder;
		const node3 = populateFile('n3', 'third');
		// add node 1 and 3 as children, node 2 is the new file
		currentFolder.children.nodes.push(node1, node3);

		const createOptions = spyOnCreateOptions();

		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({
					getChildren: [currentFolder],
					getPermissions: [currentFolder],
					getNode: [node2]
				})
			}
		} satisfies Partial<Resolvers>;

		server.use(
			http.post(DOCS_ENDPOINT + CREATE_FILE_PATH, () =>
				HttpResponse.json({
					nodeId: node2.id
				})
			)
		);

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// wait for the load to be completed
		await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);

		clickOnCreateDocsAction(createOptions, ACTION_IDS.CREATE_DOCS_DOCUMENT, 'libre');
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

	test('Create docs file add file node as right sorted position of the list if neighbor is already loaded but unordered', async () => {
		const currentFolder = populateFolder();
		currentFolder.children = populateNodePage(populateNodes(NODES_LOAD_LIMIT, 'Folder'));
		sortNodes(currentFolder.children.nodes, NODES_SORT_DEFAULT);
		currentFolder.permissions.can_write_folder = true;
		const node1 = populateFile('n1', `zzzz-new-file-n1`);
		node1.parent = currentFolder;
		const node2 = populateFile('n2', `zzzz-new-file-n2`);
		node2.parent = currentFolder;
		const node3 = populateFile('n3', `zzzz-new-file-n3`);
		node3.parent = currentFolder;
		// 1) folder with more pages, just 1 loaded
		// 2) create node2 as unordered node3 (not loaded) as neighbor)
		// --> node2 should be last element of the list
		// 3) create node1 as unordered (node2 (loaded and unordered) as neighbor)
		// --> node1 should be put before node2 in the unordered
		// 4) trigger loadMore and load node1, node2, node3 with this order
		// --> list should be updated with the correct order
		const childrenResolver: FolderResolvers['children'] = (parent, args) => {
			if (parent.id === currentFolder.id) {
				if (args.page_token === 'page2') {
					return populateNodePage([node1, node2, node3]);
				}
				return populateNodePage(currentFolder.children.nodes, NODES_LOAD_LIMIT, 'page2');
			}
			return parent.children;
		};

		const createOptions = spyOnCreateOptions();

		const mocks = {
			Folder: {
				children: childrenResolver
			},
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({
					getChildren: [currentFolder, currentFolder],
					getPermissions: [currentFolder],
					getNode: [node1, node2]
				})
			}
		} satisfies Partial<Resolvers>;

		server.use(
			http.post<never, CreateDocsFileRequestBody, CreateDocsFileResponse>(
				`${DOCS_ENDPOINT}${CREATE_FILE_PATH}`,
				async ({ request }) => {
					const { filename } = await request.json();
					return HttpResponse.json({
						nodeId:
							(filename === node2.name && node2.id) || (filename === node1.name && node1.id) || null
					});
				}
			)
		);

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// wait for the load to be completed
		await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
		let nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
		expect(nodes).toHaveLength(currentFolder.children.nodes.length);
		clickOnCreateDocsAction(createOptions, ACTION_IDS.CREATE_DOCS_DOCUMENT, 'libre');
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
		// create action
		clickOnCreateDocsAction(createOptions, ACTION_IDS.CREATE_DOCS_DOCUMENT, 'libre');
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
		await triggerLoadMore();
		// wait for the load to be completed (node3 is now loaded)
		await screen.findByTestId(SELECTORS.nodeItem(node3.id));
		nodes = screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false });
		expect(nodes).toHaveLength(currentFolder.children.nodes.length + 3);
		// node1, node2 and node3 should have the correct order
		expect(screen.getByTestId(SELECTORS.nodeItem(node1.id))).toBe(nodes[nodes.length - 3]);
		expect(screen.getByTestId(SELECTORS.nodeItem(node2.id))).toBe(nodes[nodes.length - 2]);
		expect(screen.getByTestId(SELECTORS.nodeItem(node3.id))).toBe(nodes[nodes.length - 1]);
	});

	describe('Extension new item', () => {
		test('should render .ods extension when click createLibreDocument button', async () => {
			const createOptions = spyOnCreateOptions();
			setup(<FolderView />);
			clickOnCreateDocsAction(createOptions, ACTION_IDS.CREATE_DOCS_DOCUMENT, 'libre');
			act(() => {
				// make modal become visible
				jest.runOnlyPendingTimers();
			});
			expect(await screen.findByText(/.odt/i)).toBeVisible();
		});

		test('should render .docx extension when click createMsDocument button', async () => {
			const createOptions = spyOnCreateOptions();
			setup(<FolderView />);
			clickOnCreateDocsAction(createOptions, ACTION_IDS.CREATE_DOCS_DOCUMENT, 'ms');
			act(() => {
				// make modal become visible
				jest.runOnlyPendingTimers();
			});
			expect(await screen.findByText(/.docx/i)).toBeVisible();
		});
	});

	it('should show a permanent error snackbar if the creation of a document fails because of the over quota', async () => {
		const currentFolder = populateFolder();
		const mocks = {
			Query: {
				getPath: mockGetPath([currentFolder]),
				getNode: mockGetNode({
					getChildren: [currentFolder],
					getPermissions: [currentFolder]
				})
			}
		} satisfies Partial<Resolvers>;

		server.use(
			http.post(`${DOCS_ENDPOINT}${CREATE_FILE_PATH}`, () =>
				HttpResponse.json(null, {
					status: HTTP_STATUS_CODE.overQuota
				})
			)
		);
		const createOptions = spyOnCreateOptions();
		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});
		await screen.findByText(LIST_EMPTY_MESSAGE);
		clickOnCreateDocsAction(createOptions, ACTION_IDS.CREATE_DOCS_DOCUMENT, 'libre');
		await createNode({ name: 'over quota' }, user);
		const snackbar = await screen.findByText(
			'New document creation failed. You have reached your storage limit. Delete some items to free up storage space and try again.'
		);
		expect(snackbar).toBeVisible();
		expect(screen.getByRole('button', { name: /ok/i })).toBeVisible();
		expect(screen.getByTestId(ICON_REGEXP.errorSnackbar)).toBeVisible();
		jest.advanceTimersByTime(TIMERS.snackbar.hide);
		expect(snackbar).toBeVisible();
	});

	it.each<
		[
			string,
			Parameters<typeof clickOnCreateDocsAction>[2],
			Parameters<typeof clickOnCreateDocsAction>[1]
		]
	>([
		['document', 'libre', ACTION_IDS.CREATE_DOCS_DOCUMENT],
		['document', 'ms', ACTION_IDS.CREATE_DOCS_DOCUMENT],
		['spreadsheet', 'libre', ACTION_IDS.CREATE_DOCS_SPREADSHEET],
		['spreadsheet', 'ms', ACTION_IDS.CREATE_DOCS_SPREADSHEET],
		['presentation', 'libre', ACTION_IDS.CREATE_DOCS_PRESENTATION],
		['presentation', 'ms', ACTION_IDS.CREATE_DOCS_PRESENTATION]
	])(
		'should show specific over quota message if creating a %s %s',
		async (expectedString, docType, action) => {
			const currentFolder = populateFolder();
			const mocks = {
				Query: {
					getPath: mockGetPath([currentFolder]),
					getNode: mockGetNode({
						getChildren: [currentFolder],
						getPermissions: [currentFolder]
					})
				}
			} satisfies Partial<Resolvers>;

			server.use(
				http.post(`${DOCS_ENDPOINT}${CREATE_FILE_PATH}`, () =>
					HttpResponse.json(null, {
						status: HTTP_STATUS_CODE.overQuota
					})
				)
			);
			const createOptions = spyOnCreateOptions();
			const { user } = setup(<FolderView />, {
				initialRouterEntries: [`/?folder=${currentFolder.id}`],
				mocks
			});
			await screen.findByText(LIST_EMPTY_MESSAGE);
			clickOnCreateDocsAction(createOptions, action, docType);
			await createNode({ name: 'over quota' }, user);
			expect(
				await screen.findByText(
					`New ${expectedString} creation failed. You have reached your storage limit. Delete some items to free up storage space and try again.`
				)
			).toBeVisible();
		}
	);
});
