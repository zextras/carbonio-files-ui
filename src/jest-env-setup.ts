/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import '@testing-library/jest-dom/extend-expect';
import { act, configure } from '@testing-library/react';
import failOnConsole from 'jest-fail-on-console';

import buildClient from './carbonio-files-ui-common/apollo';
import { destinationVar } from './carbonio-files-ui-common/apollo/destinationVar';
import { draggedItemsVar } from './carbonio-files-ui-common/apollo/dragAndDropVar';
import { nodeSortVar } from './carbonio-files-ui-common/apollo/nodeSortVar';
import { searchParamsVar } from './carbonio-files-ui-common/apollo/searchVar';
import { selectionModeVar } from './carbonio-files-ui-common/apollo/selectionVar';
import { uploadFunctionsVar, uploadVar } from './carbonio-files-ui-common/apollo/uploadVar';
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
	// Do not useFakeTimers with `whatwg-fetch` if using mocked server
	// https://github.com/mswjs/msw/issues/448

	// reset apollo client cache
	global.apolloClient.resetStore();
	// reset reactive variables
	selectionModeVar(false);
	searchParamsVar({});
	uploadVar({});
	uploadFunctionsVar({});
	nodeSortVar(NODES_SORT_DEFAULT);
	draggedItemsVar(null);
	destinationVar({ defaultValue: undefined, currentValue: undefined });
});

beforeAll(() => {
	server.listen({ onUnhandledRequest: 'warn' });

	jest.retryTimes(2, { logErrorsBeforeRetry: true });

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

	Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
		writable: true,
		value: jest.fn()
	});

	global.mockedUserLogged = LOGGED_USER;

	global.userSettings = USER_SETTINGS;

	let mockedStore: Record<string, unknown> = {};
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

	window.resizeTo = function resizeTo(width, height): void {
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
	jest.runOnlyPendingTimers();
	server.resetHandlers();
	act(() => {
		window.resizeTo(1024, 768);
	});
});
