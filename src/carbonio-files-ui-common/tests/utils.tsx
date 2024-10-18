/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { ReactElement, useMemo } from 'react';

import { ApolloClient, ApolloProvider } from '@apollo/client';
import { SchemaLink } from '@apollo/client/link/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { makeExecutableSchema } from '@graphql-tools/schema';
import {
	act,
	fireEvent,
	render,
	RenderOptions,
	RenderResult,
	screen as rtlScreen,
	waitFor,
	within as rtlWithin,
	type Screen,
	RenderHookOptions,
	RenderHookResult,
	renderHook
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalManager, SnackbarManager } from '@zextras/carbonio-design-system';
import { PreviewManager } from '@zextras/carbonio-ui-preview';
import { EventEmitter } from 'events';
import { GraphQLError } from 'graphql';
import { forEach, map, reduce, merge, noop } from 'lodash';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';

import { queriesExtended } from './queries';
import * as useCreateOptionsModule from '../../hooks/useCreateOptions';
import { CreateOption } from '../../hooks/useCreateOptions';
import I18nFactory from '../../mocks/i18n-test-factory';
import StyledWrapper from '../../StyledWrapper';
import { ERROR_CODE } from '../constants';
import { ICON_REGEXP, SELECTORS } from '../constants/test';
import GRAPHQL_SCHEMA from '../graphql/schema.graphql';
import { AdvancedFilters, Node } from '../types/common';
import { Resolvers } from '../types/graphql/resolvers-types';
import { Folder } from '../types/graphql/types';
import { resolvers } from '../utils/resolvers';
import { asyncForEach, isFile, isFolder } from '../utils/utils';

export type UserEvent = ReturnType<(typeof userEvent)['setup']> & {
	readonly rightClick: (target: Element) => Promise<void>;
};

export function within(
	element: Parameters<typeof rtlWithin<typeof queriesExtended>>[0]
): ReturnType<typeof rtlWithin<typeof queriesExtended>> {
	return rtlWithin(element, queriesExtended);
}

export const screen: Screen<typeof queriesExtended> = { ...rtlScreen, ...within(document.body) };

function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Create a regExp for searching breadcrumb as a string with the textWithMarkup helper function.
 * <br />
 * The regExp is built to match a breadcrumb formed as "/ level0 / level1 / level2" ,
 * with a / at the beginning and no / at the end
 * @param nodesNames
 *
 * @example
 * // returns /^/\s*level0\s*\/\s*level1(?!/)$
 * buildBreadCrumbRegExp('level0', 'level1');
 * @returns {RegExp} Returns a regular expression instance to match a breadcrumb in the asserted format
 */
export const buildBreadCrumbRegExp = (...nodesNames: string[]): RegExp => {
	let regExp = '^/\\s*';
	forEach(nodesNames, (name, index) => {
		if (index !== 0) {
			regExp += '/';
		}
		regExp += `\\s*${escapeRegExp(name)}\\s*`;
	});
	regExp += `(?!/)$`;
	return RegExp(regExp, 'g');
};

export function generateError(
	message: string,
	options?: {
		code?: (typeof ERROR_CODE)[keyof typeof ERROR_CODE];
		operationName?: string;
	}
): GraphQLError {
	return new GraphQLError(`Controlled error: ${message}`, {
		extensions: {
			errorCode: options?.code
		},
		path: options?.operationName ? [options.operationName] : undefined
	});
}

interface WrapperProps {
	children?: React.ReactNode;
	initialRouterEntries?: string[];
	mocks?: Partial<Resolvers>;
}
const ApolloProviderWrapper = ({
	children,
	mocks
}: Pick<WrapperProps, 'children' | 'mocks'>): React.JSX.Element => {
	const client = useMemo(() => {
		if (mocks !== undefined) {
			const schema = makeExecutableSchema({ typeDefs: GRAPHQL_SCHEMA });
			const mockSchema = addMocksToSchema({
				schema,
				resolvers: merge({}, resolvers, mocks)
			});
			return new ApolloClient({
				link: new SchemaLink({ schema: mockSchema }),
				cache: global.apolloClient.cache
			});
		}
		return global.apolloClient;
	}, [mocks]);

	return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

const Wrapper = ({ mocks, initialRouterEntries, children }: WrapperProps): React.JSX.Element => {
	const i18n = useMemo(() => {
		const i18nFactory = new I18nFactory();
		return i18nFactory.getAppI18n();
	}, []);

	return (
		<ApolloProviderWrapper mocks={mocks}>
			<MemoryRouter
				initialEntries={initialRouterEntries}
				initialIndex={
					initialRouterEntries !== undefined && initialRouterEntries.length > 0
						? initialRouterEntries.length - 1
						: 0
				}
			>
				<StyledWrapper>
					<I18nextProvider i18n={i18n}>
						<SnackbarManager>
							<ModalManager>
								<PreviewManager>{children}</PreviewManager>
							</ModalManager>
						</SnackbarManager>
					</I18nextProvider>
				</StyledWrapper>
			</MemoryRouter>
		</ApolloProviderWrapper>
	);
};

function customRender(
	ui: React.ReactElement,
	{
		initialRouterEntries = ['/'],
		mocks,
		...options
	}: WrapperProps & {
		options?: Omit<RenderOptions, 'queries' | 'wrapper'>;
	} = {}
): RenderResult<typeof queriesExtended> {
	return render(ui, {
		wrapper: ({ children }: Pick<WrapperProps, 'children'>) => (
			<Wrapper initialRouterEntries={initialRouterEntries} mocks={mocks}>
				{children}
			</Wrapper>
		),
		queries: queriesExtended,
		...options
	});
}

type SetupOptions = Pick<WrapperProps, 'initialRouterEntries' | 'mocks'> & {
	renderOptions?: Omit<RenderOptions, 'queries' | 'wrapper'>;
	setupOptions?: Parameters<(typeof userEvent)['setup']>[0];
};

const setupUserEvent = (options: SetupOptions['setupOptions']): UserEvent => {
	const user = userEvent.setup(options);
	const rightClick = (target: Element): Promise<void> =>
		user.pointer({ target, keys: '[MouseRight]' });
	return {
		...user,
		rightClick
	};
};

export const setup = (
	ui: ReactElement,
	options?: SetupOptions
): { user: UserEvent } & ReturnType<typeof customRender> => ({
	user: setupUserEvent({ advanceTimers: jest.advanceTimersByTimeAsync, ...options?.setupOptions }),
	...customRender(ui, {
		initialRouterEntries: options?.initialRouterEntries,
		mocks: options?.mocks,
		...options?.renderOptions
	})
});

/**
 * Generate a wrapper for testing hooks with apollo operations
 */
export function setupHook<TProps, TResult>(
	hook: (props: TProps) => TResult,
	options?: Pick<WrapperProps, 'initialRouterEntries' | 'mocks'> & RenderHookOptions<TProps>
): RenderHookResult<TResult, TProps> {
	const view = renderHook<TResult, TProps>(hook, {
		wrapper: ({ children }: Pick<WrapperProps, 'children'>) => (
			<Wrapper {...options}>{children}</Wrapper>
		)
	});

	const hookFn = view.result.current;
	expect(hookFn).toBeDefined();
	return view;
}

export function triggerLoadMore(
	{
		target = screen.getByTestId(ICON_REGEXP.queryLoading),
		...intersectionOptions
	}: Partial<IntersectionObserverEntry> = {},
	callsIndex: number = 0
): void {
	const { calls, instances } = jest.mocked(window.IntersectionObserver).mock;
	const [onChange] = calls[callsIndex ?? calls.length - 1];
	// trigger the intersection on the observed element
	act(() => {
		onChange(
			[
				{
					target,
					intersectionRatio: 0,
					isIntersecting: true,
					boundingClientRect: {
						bottom: 0,
						height: 0,
						left: 0,
						right: 0,
						top: 0,
						width: 0,
						x: 0,
						y: 0,
						toJSON: (): string => {
							throw new Error('Function not implemented.');
						}
					},
					intersectionRect: {
						bottom: 0,
						height: 0,
						left: 0,
						right: 0,
						top: 0,
						width: 0,
						x: 0,
						y: 0,
						toJSON: (): string => {
							throw new Error('Function not implemented.');
						}
					},
					rootBounds: null,
					time: 0,
					...intersectionOptions
				}
			],
			instances[instances.length - 1]
		);
	});
}

export function triggerListLoadMore(callsIndex?: number, isIntersecting = true): void {
	triggerLoadMore(
		{
			target: screen.getByTestId('list-bottom-element'),
			intersectionRatio: 0.5,
			isIntersecting
		},
		callsIndex
	);
}

export function makeListItemsVisible(): void {
	const { calls, instances } = jest.mocked(window.IntersectionObserver).mock;
	calls.forEach((call, index) => {
		const [onChange] = call;
		// trigger the intersection on the observed element
		act(() => {
			onChange(
				[
					{
						intersectionRatio: 0,
						isIntersecting: true,
						boundingClientRect: {
							bottom: 0,
							height: 0,
							left: 0,
							right: 0,
							top: 0,
							width: 0,
							x: 0,
							y: 0,
							toJSON: (): string => {
								throw new Error('Function not implemented.');
							}
						},
						intersectionRect: {
							bottom: 0,
							height: 0,
							left: 0,
							right: 0,
							top: 0,
							width: 0,
							x: 0,
							y: 0,
							toJSON: (): string => {
								throw new Error('Function not implemented.');
							}
						},
						rootBounds: null,
						target: document.documentElement,
						time: 0
					}
				],
				instances[index]
			);
		});
	});
}

export async function selectNodes(nodesToSelect: string[], user: UserEvent): Promise<void> {
	await asyncForEach(nodesToSelect, async (id) => {
		const node = within(screen.getByTestId(SELECTORS.nodeItem(id)));
		let clickableItem = node.queryByTestId(SELECTORS.nodeAvatar);
		if (clickableItem == null) {
			clickableItem = node.queryByTestId(SELECTORS.uncheckedAvatar);
		}
		if (clickableItem == null) {
			clickableItem = node.queryByTestId(SELECTORS.checkedAvatar);
		}
		if (clickableItem) {
			await user.click(clickableItem);
		}
	});
}

export async function renameNode(newName: string, user: UserEvent): Promise<void> {
	// check that the rename action becomes visible and click on it
	await screen.findByText(/\brename\b/i);
	await user.click(screen.getByText(/\brename\b/i));
	// fill new name in modal input field
	const inputField = await screen.findByRole('textbox');
	act(() => {
		// run timers of modal
		jest.advanceTimersToNextTimer();
	});
	await user.clear(inputField);
	await user.type(inputField, newName);
	expect(inputField).toHaveValue(newName);
	// click on confirm button (rename)
	const button = screen.getByRole('button', { name: /rename/i });
	await user.click(button);
}

export async function moveNode(destinationFolder: Folder, user: UserEvent): Promise<void> {
	let moveAction = screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.move });
	if (!moveAction) {
		const moreVertical = screen.queryByRoleWithIcon('button', { icon: ICON_REGEXP.moreVertical });
		if (moreVertical) {
			await user.click(moreVertical);
		}
		moveAction = await screen.findByText('Move');
	}
	await user.click(moveAction);
	const modalList = await screen.findByTestId(SELECTORS.modalList);
	act(() => {
		// run timers of modal
		jest.runOnlyPendingTimers();
	});
	const destinationFolderItem = await within(modalList).findByText(destinationFolder.name);
	await user.click(destinationFolderItem);
	await waitFor(() => expect(screen.getByRole('button', { name: /move/i })).toBeEnabled());
	await user.click(screen.getByRole('button', { name: /move/i }));
	await waitFor(() =>
		expect(screen.queryByRole('button', { name: /move/i })).not.toBeInTheDocument()
	);
	expect(moveAction).not.toBeInTheDocument();
}

export function buildChipsFromKeywords(keywords: string[]): AdvancedFilters['keywords'] {
	return map(keywords, (k) => ({ label: k, hasAvatar: false, value: k, background: 'gray2' }));
}

export function getFirstOfNextMonth(from: Date | number = Date.now()): Date {
	const startingDate = new Date(from);
	let chosenDate: Date;
	if (startingDate.getMonth() === 11) {
		chosenDate = new Date(startingDate.getFullYear() + 1, 0, 1);
	} else {
		chosenDate = new Date(startingDate.getFullYear(), startingDate.getMonth() + 1, 1);
	}
	return chosenDate;
}

// utility to make msw respond in a controlled way
// see https://github.com/mswjs/msw/discussions/1307
export async function delayUntil(emitter: EventEmitter, event: string): Promise<void> {
	return new Promise((resolve) => {
		emitter.once(event, resolve);
	});
}

type DataTransferUploadStub = {
	items: Array<{ webkitGetAsEntry: () => Partial<FileSystemEntry> }>;
	files: Array<File>;
	types: Array<string>;
};

function createFileSystemDirectoryEntryReader(
	folder: Pick<Folder, '__typename' | 'name' | 'children'>
): ReturnType<FileSystemDirectoryEntry['createReader']> {
	// clone array to mutate with the splice in order to simulate the readEntries called until it returns an empty array (or undefined)
	// eslint-disable-next-line testing-library/no-node-access
	const children = [...folder.children.nodes];
	const readEntries = (
		successCallback: FileSystemEntriesCallback
	): ReturnType<FileSystemDirectoryReader['readEntries']> => {
		const childrenEntries = reduce<(typeof folder.children.nodes)[number], FileSystemEntry[]>(
			children.splice(0, Math.min(children.length, 10)),
			(accumulator, childNode) => {
				if (childNode) {
					accumulator.push(
						// eslint-disable-next-line @typescript-eslint/no-use-before-define
						createFileSystemEntry(
							childNode,
							(isFile(childNode) &&
								new File(['(⌐□_□)😂😂😂😂'], childNode.name, {
									type: (isFile(childNode) && childNode.mime_type) || undefined
								})) ||
								undefined
						)
					);
				}
				return accumulator;
			},
			[]
		);
		successCallback(childrenEntries);
	};

	return {
		readEntries
	};
}

function createFileSystemEntry(
	node: Node<'name', 'mime_type', 'children'>,
	file?: File
): FileSystemDirectoryEntry | FileSystemFileEntry {
	const baseEntry: FileSystemEntry = {
		name: node.name,
		fullPath: `/${node.name}`,
		isFile: isFile(node),
		isDirectory: isFolder(node),
		filesystem: {
			name: node.name,
			root: new FileSystemDirectoryEntry()
		},
		getParent: noop
	};
	if (isFolder(node)) {
		const reader = createFileSystemDirectoryEntryReader(node);
		return {
			...baseEntry,
			createReader: () => reader,
			getFile: noop,
			getDirectory: noop
		} satisfies FileSystemDirectoryEntry;
	}
	return {
		...baseEntry,
		file(
			successCallback: FileCallback,
			errorCallback?: ErrorCallback
		): ReturnType<FileSystemFileEntry['file']> {
			if (file) {
				successCallback(file);
			} else if (errorCallback) {
				errorCallback(new DOMException('no file provided', 'createFileSystemEntry'));
			}
		}
	} satisfies FileSystemFileEntry;
}

export function createUploadDataTransfer(
	nodes: Array<Node<'name', 'mime_type', 'children'>>
): DataTransferUploadStub {
	const fileBlobs: File[] = [];
	const items = nodes.map((node) => {
		const fileBlob = new File(['(⌐□_□)😂😂😂😂'], node.name, {
			type: (isFile(node) && node.mime_type) || undefined
		});
		fileBlobs.push(fileBlob);
		const fileEntry = createFileSystemEntry(node, fileBlob);
		return {
			webkitGetAsEntry: () => fileEntry
		};
	});

	return {
		files: fileBlobs,
		items,
		types: ['Files']
	};
}

type DataTransferMoveStub = Pick<
	DataTransfer,
	'setDragImage' | 'setData' | 'getData' | 'types' | 'clearData'
>;
export function createMoveDataTransfer(): () => DataTransferMoveStub {
	const dataTransferData = new Map<string, string>();
	const dataTransferTypes: string[] = [];
	return (): DataTransferMoveStub => ({
		setDragImage(): void {
			// do nothing
		},
		setData(type, data): void {
			dataTransferData.set(type, data);
			dataTransferTypes.includes(type) || dataTransferTypes.push(type);
		},
		getData(key): string {
			return dataTransferData.get(key) ?? '';
		},
		types: dataTransferTypes,
		clearData(): void {
			dataTransferTypes.splice(0, dataTransferTypes.length);
			dataTransferData.clear();
		}
	});
}

export async function uploadWithDnD(
	dropzoneElement: HTMLElement,
	dataTransferObj: DataTransferUploadStub
): Promise<void> {
	fireEvent.dragEnter(dropzoneElement, {
		dataTransfer: dataTransferObj
	});
	await screen.findByTestId(SELECTORS.dropzone);
	expect(
		screen.getByText(/Drop here your attachments to quick-add them to your Home/m)
	).toBeVisible();
	fireEvent.drop(dropzoneElement, {
		dataTransfer: dataTransferObj
	});
	await act(async () => {
		await jest.advanceTimersToNextTimerAsync();
	});
	if (dataTransferObj.files.length > 0) {
		// use find all to make this work also when there is the displayer open
		await screen.findAllByText(dataTransferObj.files[0].name);
	}
	expect(screen.queryByText(/Drop here your attachments/m)).not.toBeInTheDocument();
}

export function spyOnUseCreateOptions(): CreateOption[] {
	const createOptionsCollector: CreateOption[] = [];
	jest.spyOn(useCreateOptionsModule, 'useCreateOptions').mockReturnValue({
		setCreateOptions: (...options: CreateOption[]): void => {
			createOptionsCollector.splice(0, createOptionsCollector.length, ...options);
		},
		removeCreateOptions: (...ids: string[]): void => {
			createOptionsCollector.splice(
				0,
				createOptionsCollector.length,
				...createOptionsCollector.filter((option) => !ids.includes(option.id))
			);
		}
	});
	return createOptionsCollector;
}
