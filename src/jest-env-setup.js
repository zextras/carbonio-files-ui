/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import '@testing-library/jest-dom/extend-expect';
import { act, configure } from '@testing-library/react';
import failOnConsole from 'jest-fail-on-console';

import buildClient from './carbonio-files-ui-common/apollo';
import { draggedItemsVar } from './carbonio-files-ui-common/apollo/dragAndDropVar';
import { nodeListCursorVar } from './carbonio-files-ui-common/apollo/nodeListCursorVar';
import { nodeSortVar } from './carbonio-files-ui-common/apollo/nodeSortVar';
import { searchParamsVar } from './carbonio-files-ui-common/apollo/searchVar';
import { selectionModeVar } from './carbonio-files-ui-common/apollo/selectionVar';
import {
	uploadCounterVar,
	uploadFunctionsVar,
	uploadVar
} from './carbonio-files-ui-common/apollo/uploadVar';
import { NODES_SORT_DEFAULT } from './carbonio-files-ui-common/constants';
import { LOGGED_USER, USER_SETTINGS } from './mocks/constants';
import server from './mocks/server';

configure({
	asyncUtilTimeout: 2000
});

failOnConsole({
	shouldFailOnWarn: true,
	shouldFailOnError: true,
	silenceMessage: (errorMessage) =>
		// snackbar PropType error on Window type
		/Invalid prop `target` of type `Window` supplied to `ForwardRef\(SnackbarFn\)`/.test(
			errorMessage
		) ||
		// errors forced from the tests
		/Controlled error/gi.test(errorMessage)
});

beforeEach(() => {
	// Do not useFakeTimers with `whatwg-fetch` if using mocked server
	// https://github.com/mswjs/msw/issues/448
	jest.useFakeTimers();

	// reset apollo client cache
	global.apolloClient.resetStore();
	// reset reactive variables
	nodeListCursorVar({});
	selectionModeVar(false);
	searchParamsVar({});
	uploadVar([]);
	uploadFunctionsVar({});
	uploadCounterVar(0);
	nodeSortVar(NODES_SORT_DEFAULT);
	draggedItemsVar(null);
});

beforeAll(() => {
	server.listen();

	jest.setTimeout(30000);
	jest.retryTimes(2);

	// initialize an apollo client instance for test and makes it available globally
	global.apolloClient = buildClient();

	// define browser objects non available in jest
	// https://jestjs.io/docs/en/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: jest.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: jest.fn(), // Deprecated
			removeListener: jest.fn(), // Deprecated
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
			dispatchEvent: jest.fn()
		}))
	});

	// mock a simplified Intersection Observer
	Object.defineProperty(window, 'IntersectionObserver', {
		writable: true,
		value: jest.fn().mockImplementation((callback, options) => ({
			thresholds: options.threshold,
			root: options.root,
			rootMargin: options.rootMargin,
			observe: jest.fn(),
			unobserve: jest.fn(),
			disconnect: jest.fn()
		}))
	});

	global.clipboard = [];

	Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
		writable: true,
		value: jest.fn()
	});

	Object.defineProperty(navigator, 'clipboard', {
		writable: true,
		value: {
			writeText: jest.fn().mockImplementation((text) => {
				global.clipboard.push(text);
				return Promise.resolve();
			}),
			readText: jest
				.fn()
				.mockImplementation(() =>
					global.clipboard.length > 0 ? global.clipboard[global.clipboard.length - 1] : null
				)
		}
	});

	global.mockedUserLogged = LOGGED_USER;

	global.userSettings = USER_SETTINGS;

	let mockedStore = {};
	Object.defineProperty(window, 'localStorage', {
		writable: true,
		value: {
			getItem: jest.fn().mockImplementation((key) => mockedStore[key] || null),
			setItem: jest.fn().mockImplementation((key, value) => {
				mockedStore[key] = value.toString();
			}),
			removeItem: jest.fn().mockImplementation((key) => {
				delete mockedStore[key];
			}),
			clear() {
				mockedStore = {};
			}
		}
	});

	window.resizeTo = function resizeTo(width, height) {
		Object.assign(this, {
			innerWidth: width,
			innerHeight: height,
			outerWidth: width,
			outerHeight: height
		}).dispatchEvent(new this.Event('resize'));
	};

	Element.prototype.scrollTo = jest.fn();
});

afterAll(() => server.close());
afterEach(() => {
	// server.resetHandlers();
	jest.runOnlyPendingTimers();
	jest.useRealTimers();
	jest.restoreAllMocks();
	act(() => {
		window.resizeTo(1024, 768);
	});
});
