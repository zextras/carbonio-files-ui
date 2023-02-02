/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { ReactElement, useContext, useEffect, useMemo } from 'react';

import { ApolloProvider } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing';
import {
	act,
	ByRoleMatcher,
	ByRoleOptions,
	fireEvent,
	GetAllBy,
	queries,
	queryHelpers,
	render,
	RenderOptions,
	RenderResult,
	screen,
	waitFor,
	within
} from '@testing-library/react';
import { renderHook, RenderHookOptions, RenderHookResult } from '@testing-library/react-hooks';
import userEvent from '@testing-library/user-event';
import { ModalManager, SnackbarManager } from '@zextras/carbonio-design-system';
import { PreviewManager, PreviewsManagerContext } from '@zextras/carbonio-ui-preview';
import { PreviewManagerContextType } from '@zextras/carbonio-ui-preview/lib/preview/PreviewManager';
import { EventEmitter } from 'events';
import { GraphQLError } from 'graphql';
import { forEach, map, filter, reduce } from 'lodash';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';

import I18nFactory from '../../i18n/i18n-test-factory';
import StyledWrapper from '../../StyledWrapper';
import { SELECTORS } from '../constants/test';
import { AdvancedFilters, Node } from '../types/common';
import { File as FilesFile, Folder } from '../types/graphql/types';
import { Mock } from './mockUtils';
import { isFile, isFolder } from './utils';

export type UserEvent = ReturnType<typeof userEvent['setup']>;

/**
 * Matcher function to search a string in more html elements and not just in a single element.
 */
const queryAllByTextWithMarkup: GetAllBy<[string | RegExp]> = (container, text) =>
	screen.queryAllByText((_content, element) => {
		if (element && element instanceof HTMLElement) {
			const hasText = (singleNode: Element): boolean => {
				const regExp = RegExp(text);
				return singleNode.textContent != null && regExp.test(singleNode.textContent);
			};
			const childrenDontHaveText = Array.from(element.children).every((child) => !hasText(child));
			return hasText(element) && childrenDontHaveText;
		}
		return false;
	});

const getByTextWithMarkupMultipleError = (
	container: Element | null,
	text: string | RegExp
): string => `Found multiple elements with text: ${text}`;
const getByTextWithMarkupMissingError = (
	container: Element | null,
	text: string | RegExp
): string => `Unable to find an element with text: ${text}`;

type ByRoleWithIconOptions = ByRoleOptions & {
	icon: string | RegExp;
};
/**
 * Matcher function to search an icon button through the icon data-testid
 */
const queryAllByRoleWithIcon: GetAllBy<[ByRoleMatcher, ByRoleWithIconOptions]> = (
	container,
	role,
	{ icon, ...options }
) =>
	filter(
		screen.queryAllByRole('button', options),
		(element) => within(element).queryByTestId(icon) !== null
	);
const getByRoleWithIconMultipleError = (
	container: Element | null,
	role: ByRoleMatcher,
	options: ByRoleWithIconOptions
): string => `Found multiple elements with role ${role} and icon ${options.icon}`;
const getByRoleWithIconMissingError = (
	container: Element | null,
	role: ByRoleMatcher,
	options: ByRoleWithIconOptions
): string => `Unable to find an element with role ${role} and icon ${options.icon}`;

const [
	queryByTextWithMarkup,
	getAllByTextWithMarkup,
	getByTextWithMarkup,
	findAllByTextWithMarkup,
	findByTextWithMarkup
] = queryHelpers.buildQueries<[string | RegExp]>(
	queryAllByTextWithMarkup,
	getByTextWithMarkupMultipleError,
	getByTextWithMarkupMissingError
);

const [
	queryByRoleWithIcon,
	getAllByRoleWithIcon,
	getByRoleWithIcon,
	findAllByRoleWithIcon,
	findByRoleWithIcon
] = queryHelpers.buildQueries<[ByRoleMatcher, ByRoleWithIconOptions]>(
	queryAllByRoleWithIcon,
	getByRoleWithIconMultipleError,
	getByRoleWithIconMissingError
);

const customQueries = {
	// byTextWithMarkup
	queryByTextWithMarkup,
	getAllByTextWithMarkup,
	getByTextWithMarkup,
	findAllByTextWithMarkup,
	findByTextWithMarkup,
	// byRoleWithIcon
	queryByRoleWithIcon,
	getAllByRoleWithIcon,
	getByRoleWithIcon,
	findAllByRoleWithIcon,
	findByRoleWithIcon
};

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

/**
 * Utility to generate an error for mocks that can be decoded with {@link decodeError}
 * @param message
 */
export function generateError(message: string): GraphQLError {
	return new GraphQLError(`Controlled error: ${message}`);
}

interface WrapperProps {
	children?: React.ReactNode | undefined;
	initialRouterEntries?: string[];
	mocks?: Mock[];
}

const Wrapper = ({ mocks, initialRouterEntries, children }: WrapperProps): JSX.Element => {
	const i18n = useMemo(() => {
		const i18nFactory = new I18nFactory();
		return i18nFactory.getAppI18n();
	}, []);

	const ApolloProviderWrapper: React.FC = ({ children: apolloChildren }) =>
		mocks ? (
			<MockedProvider mocks={mocks} cache={global.apolloClient.cache}>
				{apolloChildren}
			</MockedProvider>
		) : (
			<ApolloProvider client={global.apolloClient}>{apolloChildren}</ApolloProvider>
		);

	return (
		<ApolloProviderWrapper>
			<MemoryRouter
				initialEntries={initialRouterEntries}
				initialIndex={(initialRouterEntries?.length || 1) - 1}
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
): RenderResult<typeof queries & typeof customQueries> {
	return render(ui, {
		wrapper: ({ children }: Pick<WrapperProps, 'children'>) => (
			<Wrapper initialRouterEntries={initialRouterEntries} mocks={mocks}>
				{children}
			</Wrapper>
		),
		queries: { ...queries, ...customQueries },
		...options
	});
}

type SetupOptions = Pick<WrapperProps, 'initialRouterEntries' | 'mocks'> & {
	renderOptions?: Omit<RenderOptions, 'queries' | 'wrapper'>;
	setupOptions?: Parameters<typeof userEvent['setup']>[0];
};

export const setup = (
	ui: ReactElement,
	options?: SetupOptions
): { user: UserEvent } & ReturnType<typeof customRender> => ({
	user: userEvent.setup({ advanceTimers: jest.advanceTimersByTime, ...options?.setupOptions }),
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
): RenderHookResult<TProps, TResult> {
	const renderHookResult = renderHook<TProps, TResult>(hook, {
		wrapper: ({ children }: Pick<WrapperProps, 'children'>) => (
			<Wrapper {...options}>{children}</Wrapper>
		)
	});

	const hookFn = renderHookResult.result.current;
	expect(hookFn).toBeDefined();
	return renderHookResult;
}

export async function triggerLoadMore(): Promise<void> {
	expect(screen.getByTestId('icon: Refresh')).toBeVisible();
	const { calls } = (window.IntersectionObserver as jest.Mock<IntersectionObserver>).mock;
	const [onChange] = calls[calls.length - 1];
	// trigger the intersection on the observed element
	await waitFor(() =>
		onChange([
			{
				target: screen.getByTestId('icon: Refresh'),
				intersectionRatio: 0,
				isIntersecting: true
			}
		])
	);
}

export async function selectNodes(nodesToSelect: string[], user: UserEvent): Promise<void> {
	for (let i = 0; i < nodesToSelect.length; i += 1) {
		const id = nodesToSelect[i];
		const node = within(screen.getByTestId(`node-item-${id}`));
		let clickableItem = node.queryByTestId('file-icon-preview');
		if (clickableItem == null) {
			clickableItem = node.queryByTestId(SELECTORS.uncheckedAvatar);
		}
		if (clickableItem == null) {
			clickableItem = node.queryByTestId(SELECTORS.checkedAvatar);
		}
		if (clickableItem) {
			// eslint-disable-next-line no-await-in-loop
			await user.click(clickableItem);
		}
	}
}

export async function renameNode(newName: string, user: UserEvent): Promise<void> {
	// check that the rename action becomes visible and click on it
	await screen.findByText(/\brename\b/i);
	await user.click(screen.getByText(/\brename\b/i));
	// fill new name in modal input field
	const inputFieldDiv = await screen.findByTestId('input-name');
	act(() => {
		// run timers of modal
		jest.advanceTimersToNextTimer();
	});
	const inputField = within(inputFieldDiv).getByRole('textbox');
	await user.clear(inputField);
	await user.type(inputField, newName);
	expect(inputField).toHaveValue(newName);
	// click on confirm button (rename)
	const button = screen.getByRole('button', { name: /rename/i });
	await user.click(button);
}

export async function moveNode(destinationFolder: Folder, user: UserEvent): Promise<void> {
	const moveAction = await screen.findByText('Move');
	expect(moveAction).toBeVisible();
	await user.click(moveAction);
	const modalList = await screen.findByTestId('modal-list-', { exact: false });
	act(() => {
		// run timers of modal
		jest.runOnlyPendingTimers();
	});
	const destinationFolderItem = await within(modalList).findByText(destinationFolder.name);
	await user.click(destinationFolderItem);
	await waitFor(() =>
		expect(screen.getByRole('button', { name: /move/i })).not.toHaveAttribute('disabled', '')
	);
	await user.click(screen.getByRole('button', { name: /move/i }));
	await waitFor(() =>
		expect(screen.queryByRole('button', { name: /move/i })).not.toBeInTheDocument()
	);
	expect(screen.queryByText('Move')).not.toBeInTheDocument();
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

export const PreviewInitComponent: React.FC<{
	initPreviewArgs: Parameters<PreviewManagerContextType['initPreview']>[0];
}> = ({ children, initPreviewArgs }) => {
	const { initPreview, emptyPreview } = useContext(PreviewsManagerContext);

	useEffect(() => {
		initPreview(initPreviewArgs);
		return emptyPreview;
	}, [emptyPreview, initPreview, initPreviewArgs]);
	return <>{children}</>;
};
type DataTransferUploadStub = {
	items: Array<{ webkitGetAsEntry: () => Partial<FileSystemEntry> }>;
	files: Array<File>;
	types: Array<string>;
};

function createFileSystemDirectoryEntryReader(
	node: Pick<Folder, '__typename' | 'name' | 'children'>
): ReturnType<FileSystemDirectoryEntry['createReader']> {
	// clone array to mutate with the splice in order to simulate the readEntries called until it returns an empty array (or undefined)
	const children = [...node.children.nodes];
	const readEntries = (
		successCallback: FileSystemEntriesCallback,
		_errorCallback?: ErrorCallback
	): ReturnType<FileSystemDirectoryReader['readEntries']> => {
		const childrenEntries = reduce<typeof node.children.nodes[number], FileSystemEntry[]>(
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
	node: Pick<Node, '__typename' | 'name'> &
		(Pick<FilesFile, 'mime_type'> | Pick<Folder, '__typename'>),
	file?: File
): FileSystemEntry {
	const baseEntry: FileSystemEntry = {
		name: node.name,
		fullPath: `/${node.name}`,
		isFile: isFile(node),
		isDirectory: isFolder(node),
		filesystem: {
			name: node.name,
			root: new FileSystemDirectoryEntry()
		},
		getParent: jest.fn()
	};
	if (isFolder(node)) {
		const reader = createFileSystemDirectoryEntryReader(node);
		const directoryEntry: FileSystemDirectoryEntry = {
			...baseEntry,
			createReader: () => reader,
			getFile: jest.fn(),
			getDirectory: jest.fn()
		};
		return directoryEntry;
	}
	const fileEntry: FileSystemFileEntry = {
		...baseEntry,
		file(successCallback: FileCallback, errorCallback?: ErrorCallback) {
			if (file) {
				successCallback(file);
			} else if (errorCallback) {
				errorCallback(new DOMException('no file provided', 'createFileSystemEntry'));
			}
		}
	};
	return fileEntry;
}

export function createDataTransfer(nodes: Array<Node>): DataTransferUploadStub {
	const fileBlobs: File[] = [];
	const items = map<Node, { webkitGetAsEntry: () => Partial<FileSystemEntry> }>(nodes, (node) => {
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

export async function uploadWithDnD(
	dropzoneElement: HTMLElement,
	dataTransferObj: DataTransferUploadStub
): Promise<void> {
	fireEvent.dragEnter(dropzoneElement, {
		dataTransfer: dataTransferObj
	});

	await screen.findByTestId('dropzone-overlay');
	expect(
		screen.getByText(/Drop here your attachments to quick-add them to your Home/m)
	).toBeVisible();

	fireEvent.drop(dropzoneElement, {
		dataTransfer: dataTransferObj
	});

	if (dataTransferObj.files.length > 0) {
		// use find all to make this work also when there is the displayer open
		await screen.findAllByText(dataTransferObj.files[0].name, undefined, {
			onTimeout: (err) => {
				screen.logTestingPlaygroundURL();
				return err;
			}
		});
	}
	expect(screen.queryByText(/Drop here your attachments/m)).not.toBeInTheDocument();
}
