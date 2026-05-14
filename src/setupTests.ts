/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import '@testing-library/jest-dom';
import React from 'react';

import { type ApolloClient } from '@apollo/client';
import { act, configure } from '@testing-library/react';
import { Account } from '@zextras/carbonio-shell-ui';
import dotenv from 'dotenv';
import { noop } from 'lodash';
import failOnConsole from 'vitest-fail-on-console';

import buildClient from './carbonio-files-ui-common/apollo';
import { destinationVar } from './carbonio-files-ui-common/apollo/destinationVar';
import { draggedItemsVar } from './carbonio-files-ui-common/apollo/dragAndDropVar';
import { nodeSortVar } from './carbonio-files-ui-common/apollo/nodeSortVar';
import { searchParamsVar } from './carbonio-files-ui-common/apollo/searchVar';
import { uploadFunctionsVar, uploadVar } from './carbonio-files-ui-common/apollo/uploadVar';
import { viewModeVar } from './carbonio-files-ui-common/apollo/viewModeVar';
import { NODES_SORT_DEFAULT, VIEW_MODE_DEFAULT } from './carbonio-files-ui-common/constants';
import { healthCache } from './carbonio-files-ui-common/hooks/useHealthInfo';
import { LOGGED_USER_ACCOUNT } from './mocks/constants';
import server from './mocks/server';

dotenv.config();

type FileSystemDirectoryEntryMock = Omit<FileSystemDirectoryEntry, 'filesystem'> & {
	filesystem: Partial<FileSystemDirectoryEntry['filesystem']>;
};

// see https://stackoverflow.com/a/68328575
declare global {
	// eslint-disable-next-line no-var,vars-on-top
	var apolloClient: ApolloClient<object>;
	// eslint-disable-next-line no-var,vars-on-top
	var mockedUserLogged: Account;
}

configure({
	asyncUtilTimeout: 2000
});

vi.mock('@zextras/carbonio-shell-ui');

vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom');
	return {
		...actual,
		useBlocker: vi.fn().mockImplementation(() => ({
			state: 'unblocked',
			proceed: vi.fn()
		}))
	};
});

const mockContextValue = {
	initPreview: vi.fn(),
	emptyPreview: vi.fn(),
	openPreview: vi.fn(),
	closePreview: vi.fn(),
	previews: [],
	currentIndex: 0
};

const MockPreviewsManagerContext = React.createContext(mockContextValue);

vi.mock('@zextras/carbonio-ui-preview', () => ({
	__esModule: true,
	PreviewManager: ({ children }: React.PropsWithChildren): React.ReactNode => children,
	PreviewsManagerContext: MockPreviewsManagerContext,
	usePreview: vi.fn(() => ({
		initPreview: vi.fn(),
		emptyPreview: vi.fn(),
		openPreview: vi.fn(),
		closePreview: vi.fn(),
		previews: [],
		currentIndex: 0
	}))
}));

failOnConsole({
	shouldFailOnWarn: false,
	shouldFailOnError: true,
	silenceMessage: (errorMessage) =>
		// Warning: Failed prop type: Invalid prop `target` of type `Window` supplied to `ForwardRef(SnackbarFn)`, expected instance of `Window`
		// This warning is printed in the console for this render. This happens because window element is a jsdom representation of the window,
		// and it's an object instead of a Window class instance, so the check on the prop type fail for the target prop
		/Invalid prop `\w+`(\sof type `\w+`)? supplied to `(\w+(\(\w+\))?)`/.test(errorMessage) ||
		// errors forced from the tests
		/Controlled error/gi.test(errorMessage)
});

beforeAll(() => {
	vi.useFakeTimers({
		shouldAdvanceTime: true
	});

	server.listen({ onUnhandledRequest: 'warn' });

	Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
		writable: true,
		value: noop
	});

	global.mockedUserLogged = LOGGED_USER_ACCOUNT;

	window.resizeTo = function resizeTo(width, height): void {
		Object.assign(this, {
			innerWidth: width,
			innerHeight: height,
			outerWidth: width,
			outerHeight: height
		}).dispatchEvent(new this.Event('resize'));
	};

	Element.prototype.scrollTo = noop;

	Object.defineProperty(window, 'FileSystemDirectoryEntry', {
		writable: true,
		value: function FileSystemDirectoryEntryMock(): FileSystemDirectoryEntryMock {
			return {
				createReader: () => new FileSystemDirectoryReader(),
				fullPath: '',
				getDirectory: noop,
				getFile: noop,
				getParent: noop,
				isDirectory: true,
				isFile: false,
				name: '',
				filesystem: {
					name: ''
				}
			};
		}
	});

	window.open = (): ReturnType<typeof window.open> => null;
});

afterAll(() => {
	vi.useRealTimers();
	server.close();
});

beforeEach(() => {
	global.apolloClient = buildClient();

	// reset reactive variables
	searchParamsVar({});
	uploadVar({});
	uploadFunctionsVar({});
	nodeSortVar(NODES_SORT_DEFAULT);
	viewModeVar(VIEW_MODE_DEFAULT);
	draggedItemsVar(null);
	destinationVar({ defaultValue: undefined, currentValue: undefined });
	window.localStorage.clear();
	healthCache.healthRequested = true;
	healthCache.healthReceived = true;
	healthCache.healthFailed = false;
	healthCache.docsIsLive = true;
	healthCache.previewIsLive = true;

	Object.defineProperty(window, 'IntersectionObserver', {
		writable: true,
		value: vi.fn(function intersectionObserverMock(
			callback: IntersectionObserverCallback,
			options: IntersectionObserverInit
		) {
			return {
				thresholds: options.threshold,
				root: options.root,
				rootMargin: options.rootMargin,
				observe: noop,
				unobserve: noop,
				disconnect: noop
			};
		})
	});

	Object.defineProperty(window, 'ResizeObserver', {
		writable: true,
		value: vi.fn(function ResizeObserverMock(): ResizeObserver {
			return {
				observe: vi.fn(),
				unobserve: vi.fn(),
				disconnect: vi.fn()
			};
		})
	});
});

afterEach(() => {
	vi.clearAllTimers();
	server.resetHandlers();
	act(() => {
		window.resizeTo(1024, 768);
	});
	global.apolloClient.cache.reset();
});
// mock a simplified crypto
Object.defineProperty(window.crypto, 'randomUUID', {
	writable: true,
	value: vi.fn(() => Math.random().toString())
});
