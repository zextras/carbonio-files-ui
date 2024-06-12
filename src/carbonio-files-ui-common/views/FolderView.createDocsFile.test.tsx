/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { act, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import { DropdownItem } from '@zextras/carbonio-design-system';
import { map } from 'lodash';
import { http, HttpResponse } from 'msw';

import { DisplayerProps } from './components/Displayer';
import FolderView from './FolderView';
import { ACTION_IDS } from '../../constants';
import { CreateOption } from '../../hooks/useCreateOptions';
import server from '../../mocks/server';
import {
	CREATE_FILE_PATH,
	DOCS_ENDPOINT,
	DOCS_SERVICE_NAME,
	HEALTH_PATH,
	NODES_LOAD_LIMIT,
	NODES_SORT_DEFAULT,
	REST_ENDPOINT
} from '../constants';
import { ACTION_REGEXP, ICON_REGEXP, SELECTORS, TIMERS } from '../constants/test';
import { healthCache } from '../hooks/useHealthInfo';
import {
	CreateDocsFileRequestBody,
	CreateDocsFileResponse
} from '../mocks/handleCreateDocsFileRequest';
import { HealthResponse } from '../mocks/handleHealthRequest';
import {
	populateFile,
	populateFolder,
	populateNodePage,
	populateNodes,
	sortNodes
} from '../mocks/mockUtils';
import { FolderResolvers, Resolvers } from '../types/graphql/resolvers-types';
import { mockGetPath, mockGetNode } from '../utils/resolverMocks';
import { setup, spyOnUseCreateOptions, triggerLoadMore, UserEvent } from '../utils/testUtils';

jest.mock<typeof import('../../hooks/useCreateOptions')>('../../hooks/useCreateOptions');

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

function findCreateDocsOption(
	createOptions: CreateOption[],
	type: (typeof ACTION_IDS)[keyof Pick<
		typeof ACTION_IDS,
		'CREATE_DOCS_DOCUMENT' | 'CREATE_DOCS_PRESENTATION' | 'CREATE_DOCS_SPREADSHEET'
	>],
	subType: 'libre' | 'ms' = 'libre'
): DropdownItem | undefined {
	return createOptions
		.find((option) => option.id === type)
		?.action(undefined)
		.items?.find((subOption) => subOption.id === `${type}-${subType}`);
}

describe('Create docs file', () => {
	it('should show docs creation actions if docs is available', async () => {
		healthCache.reset();
		const createOptions: CreateOption[] = [];
		spyOnUseCreateOptions(createOptions);
		server.use(
			http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
				HttpResponse.json({ dependencies: [{ name: DOCS_SERVICE_NAME, live: true }] })
			)
		);
		setup(<FolderView />);
		await waitFor(() =>
			expect(createOptions).toContainEqual(expect.objectContaining({ id: ACTION_IDS.UPLOAD_FILE }))
		);
		expect(createOptions).toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_DOCUMENT })
		);
		expect(createOptions).toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_SPREADSHEET })
		);
		expect(createOptions).toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_PRESENTATION })
		);
	});

	it('should not show docs creation actions if docs is not available', async () => {
		healthCache.reset();
		const createOptions: CreateOption[] = [];
		spyOnUseCreateOptions(createOptions);
		server.use(
			http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
				HttpResponse.json({ dependencies: [{ name: DOCS_SERVICE_NAME, live: false }] })
			)
		);
		setup(<FolderView />);
		await waitFor(() =>
			expect(createOptions).toContainEqual(expect.objectContaining({ id: ACTION_IDS.UPLOAD_FILE }))
		);
		expect(createOptions).not.toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_DOCUMENT })
		);
		expect(createOptions).not.toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_SPREADSHEET })
		);
		expect(createOptions).not.toContainEqual(
			expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_PRESENTATION })
		);
	});

	it('should show docs actions inside contextual menu actions if docs is available', async () => {
		healthCache.reset();
		server.use(
			http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
				HttpResponse.json({ dependencies: [{ name: DOCS_SERVICE_NAME, live: true }] })
			)
		);
		const currentFolder = populateFolder(0);
		const mocks = {
			Query: {
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] }),
				getPath: mockGetPath([currentFolder])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});
		await user.rightClick(await screen.findByText(/It looks like there's nothing here/i));
		const dropdown = await screen.findByTestId(SELECTORS.dropdownList);
		expect(within(dropdown).getByText(ACTION_REGEXP.newDocument)).toBeVisible();
		expect(within(dropdown).getByText(ACTION_REGEXP.newSpreadsheet)).toBeVisible();
		expect(within(dropdown).getByText(ACTION_REGEXP.newPresentation)).toBeVisible();
	});

	it('should not show docs actions inside contextual menu actions if docs is not available', async () => {
		healthCache.reset();
		server.use(
			http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
				HttpResponse.json({ dependencies: [{ name: DOCS_SERVICE_NAME, live: false }] })
			)
		);
		const currentFolder = populateFolder(0);
		const mocks = {
			Query: {
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] }),
				getPath: mockGetPath([currentFolder])
			}
		} satisfies Partial<Resolvers>;
		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});
		await user.rightClick(await screen.findByText(/It looks like there's nothing here/i));
		const dropdown = await screen.findByTestId(SELECTORS.dropdownList);
		expect(within(dropdown).queryByText(ACTION_REGEXP.newDocument)).not.toBeInTheDocument();
		expect(within(dropdown).queryByText(ACTION_REGEXP.newSpreadsheet)).not.toBeInTheDocument();
		expect(within(dropdown).queryByText(ACTION_REGEXP.newPresentation)).not.toBeInTheDocument();
	});

	test('Create file options are disabled if current folder has not can_write_file permission', async () => {
		const currentFolder = populateFolder();
		currentFolder.permissions.can_write_file = false;
		const createOptions: CreateOption[] = [];
		spyOnUseCreateOptions(createOptions);
		const mocks = {
			Query: {
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] }),
				getPath: mockGetPath([currentFolder])
			}
		} satisfies Partial<Resolvers>;
		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});
		await screen.findByText(/nothing here/i);
		expect(map(createOptions, (createOption) => createOption.action({}))).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_DOCUMENT, disabled: true }),
				expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_SPREADSHEET, disabled: true }),
				expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_PRESENTATION, disabled: true })
			])
		);
	});

	test('Create docs files options are active if current folder has can_write_file permission', async () => {
		const currentFolder = populateFolder();
		currentFolder.permissions.can_write_file = true;
		const createOptions: CreateOption[] = [];
		spyOnUseCreateOptions(createOptions);
		const mocks = {
			Query: {
				getNode: mockGetNode({ getChildren: [currentFolder], getPermissions: [currentFolder] }),
				getPath: mockGetPath([currentFolder])
			}
		} satisfies Partial<Resolvers>;
		setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});
		await screen.findByText(/nothing here/i);
		expect(map(createOptions, (createOption) => createOption.action({}))).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_DOCUMENT, disabled: false }),
				expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_SPREADSHEET, disabled: false }),
				expect.objectContaining({ id: ACTION_IDS.CREATE_DOCS_PRESENTATION, disabled: false })
			])
		);
	});

	test('Create docs file operation fail shows an error in the modal and does not close it', async () => {
		const currentFolder = populateFolder();
		currentFolder.permissions.can_write_file = true;
		const node1 = populateFile('n1', 'first');
		const node2 = populateFile('n2', 'second');
		const node3 = populateFile('n3', 'third');
		currentFolder.children.nodes.push(node1, node2, node3);
		const newName = node2.name;
		const createOptions: CreateOption[] = [];
		spyOnUseCreateOptions(createOptions);

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

		const { user } = setup(<FolderView />, {
			initialRouterEntries: [`/?folder=${currentFolder.id}`],
			mocks
		});

		// wait for the load to be completed
		await waitForElementToBeRemoved(screen.queryByTestId(ICON_REGEXP.queryLoading));
		expect(screen.getAllByTestId(SELECTORS.nodeItem(), { exact: false })).toHaveLength(
			currentFolder.children.nodes.length
		);

		const createDocsDocument = findCreateDocsOption(createOptions, ACTION_IDS.CREATE_DOCS_DOCUMENT);
		expect(createDocsDocument).toBeDefined();

		act(() => {
			createDocsDocument?.onClick?.(new KeyboardEvent('keyup'));
		});

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
		const createOptions: CreateOption[] = [];
		spyOnUseCreateOptions(createOptions);
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

		const createDocsDocument = findCreateDocsOption(createOptions, ACTION_IDS.CREATE_DOCS_DOCUMENT);
		expect(createDocsDocument).toBeDefined();
		act(() => {
			createDocsDocument?.onClick?.(new KeyboardEvent('keyup'));
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

	test.skip('Create docs file add file node as right sorted position of the list if neighbor is already loaded but unordered', async () => {
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
		const createOptions: CreateOption[] = [];
		spyOnUseCreateOptions(createOptions);
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

		const createDocsDocument = findCreateDocsOption(createOptions, ACTION_IDS.CREATE_DOCS_DOCUMENT);
		expect(createDocsDocument).toBeDefined();
		act(() => {
			createDocsDocument?.onClick?.(new KeyboardEvent('keyup'));
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
			createDocsDocument?.onClick?.(new KeyboardEvent('keyup'));
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
			const createOptions: CreateOption[] = [];
			spyOnUseCreateOptions(createOptions);
			setup(<FolderView />);
			const createDocsDocument = findCreateDocsOption(
				createOptions,
				ACTION_IDS.CREATE_DOCS_DOCUMENT,
				'libre'
			);
			expect(createDocsDocument).toBeDefined();
			act(() => {
				createDocsDocument?.onClick?.(new KeyboardEvent('keyup'));
			});
			act(() => {
				jest.advanceTimersByTime(TIMERS.modalDelayOpen);
			});
			expect(await screen.findByText('.odt')).toBeVisible();
		});

		test('should render .docx extension when click createMsDocument button', async () => {
			const createOptions: CreateOption[] = [];
			spyOnUseCreateOptions(createOptions);
			setup(<FolderView />);
			const createDocsDocument = findCreateDocsOption(
				createOptions,
				ACTION_IDS.CREATE_DOCS_DOCUMENT,
				'ms'
			);
			expect(createDocsDocument).toBeDefined();
			act(() => {
				createDocsDocument?.onClick?.(new KeyboardEvent('keyup'));
			});
			act(() => {
				jest.advanceTimersByTime(TIMERS.modalDelayOpen);
			});
			expect(await screen.findByText('.docx')).toBeVisible();
		});
	});
});
