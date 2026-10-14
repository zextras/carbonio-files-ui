/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { loadUserConfig, userConfigCache, useSharesEnabled } from './useUserConfig';
import server from '../../mocks/server';
import { userConfigVar } from '../apollo/userConfigVar';
import { CONFIG_PATH, REST_ENDPOINT, SHARES_ENABLED_CONFIG_KEY } from '../constants';
import { setupHook } from '../tests/utils';

describe('useSharesEnabled', () => {
	it.each([
		[undefined, true],
		[null, true],
		['true', true],
		['false', false],
		['FALSE', false]
	])('should return %s -> %s', (value, expected) => {
		userConfigVar(value === undefined ? {} : { [SHARES_ENABLED_CONFIG_KEY]: value });
		const { result } = setupHook(() => useSharesEnabled());
		expect(result.current).toBe(expected);
	});

	it('should update when the user config changes', () => {
		const { result } = setupHook(() => useSharesEnabled());
		expect(result.current).toBe(true);
		act(() => {
			userConfigVar({ [SHARES_ENABLED_CONFIG_KEY]: 'false' });
		});
		expect(result.current).toBe(false);
	});
});

describe('loadUserConfig', () => {
	beforeEach(() => {
		userConfigCache.requested = false;
	});

	it('should fetch the user config once and keep it in memory', async () => {
		const handler = vi.fn(() => HttpResponse.json({ [SHARES_ENABLED_CONFIG_KEY]: 'false' }));
		server.use(http.get(`${REST_ENDPOINT}${CONFIG_PATH}`, handler));

		loadUserConfig();
		loadUserConfig();

		await waitFor(() => expect(userConfigVar()).toEqual({ [SHARES_ENABLED_CONFIG_KEY]: 'false' }));
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('should keep sharing enabled when the request fails', async () => {
		const handler = vi.fn(() => new HttpResponse(null, { status: 500 }));
		server.use(http.get(`${REST_ENDPOINT}${CONFIG_PATH}`, handler));

		loadUserConfig();

		await waitFor(() => expect(handler).toHaveBeenCalled());
		expect(userConfigVar()).toEqual({});
		const { result } = setupHook(() => useSharesEnabled());
		expect(result.current).toBe(true);
	});
});
