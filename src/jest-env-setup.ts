/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import '@testing-library/jest-dom';
import { type ApolloClient } from '@apollo/client';
import { act, configure } from '@testing-library/react';
import { Account } from '@zextras/carbonio-shell-ui';
import dotenv from 'dotenv';
import failOnConsole from 'jest-fail-on-console';
import { noop } from 'lodash';
// this can be removed once migrated to Node 22 (https://github.com/wojtekmaj/react-pdf/wiki/Upgrade-guide-from-version-8.x-to-9.x#dropped-support-for-older-browsers-and-nodejs-versions)
import 'core-js/proposals/promise-with-resolvers';

import buildClient from './carbonio-files-ui-common/apollo';
import { destinationVar } from './carbonio-files-ui-common/apollo/destinationVar';
import { draggedItemsVar } from './carbonio-files-ui-common/apollo/dragAndDropVar';
import { nodeSortVar } from './carbonio-files-ui-common/apollo/nodeSortVar';
import { searchParamsVar } from './carbonio-files-ui-common/apollo/searchVar';
import { selectionModeVar } from './carbonio-files-ui-common/apollo/selectionVar';
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

failOnConsole({
	shouldFailOnWarn: true,
	shouldFailOnError: true,
	silenceMessage: (errorMessage) =>
		// Warning: Failed prop type: Invalid prop `target` of type `Window` supplied to `ForwardRef(SnackbarFn)`, expected instance of `Window`
		// This warning is printed in the console for this render. This happens because window element is a jsdom representation of the window,
		// and it's an object instead of a Window class instance, so the check on the prop type fail for the target prop
		/Invalid prop `\w+`(\sof type `\w+`)? supplied to `(\w+(\(\w+\))?)`/.test(errorMessage) ||
		// errors forced from the tests
		/Controlled error/gi.test(errorMessage) ||
		/The "input" argument must be an instance of ArrayBuffer or ArrayBufferView. Received an instance of File/.test(
			errorMessage
		)
});

jest.setTimeout(60000);

beforeEach(() => {
	// reset apollo client cache
	global.apolloClient.resetStore();
	// reset reactive variables
	selectionModeVar(false);
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
		value: jest.fn(function intersectionObserverMock(
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
		value: jest.fn(function ResizeObserverMock(): ResizeObserver {
			return {
				observe: jest.fn(),
				unobserve: jest.fn(),
				disconnect: jest.fn()
			};
		})
	});
});

beforeAll(() => {
	server.listen({ onUnhandledRequest: 'warn' });

	const retryTimes = process.env.JEST_RETRY_TIMES ? parseInt(process.env.JEST_RETRY_TIMES, 10) : 2;
	jest.retryTimes(retryTimes, { logErrorsBeforeRetry: true });

	// initialize an apollo client instance for test and makes it available globally
	global.apolloClient = buildClient();

	// define browser objects non available in jest
	// https://jestjs.io/docs/en/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: (query: string): Partial<MediaQueryList> => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: noop,
			removeEventListener: noop,
			dispatchEvent: () => true
		})
	});

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
		// define it as a standard function and not arrow function because arrow functions can't be called with new
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

afterAll(() => server.close());
afterEach(() => {
	jest.runOnlyPendingTimers();
	server.resetHandlers();
	act(() => {
		window.resizeTo(1024, 768);
	});
});
