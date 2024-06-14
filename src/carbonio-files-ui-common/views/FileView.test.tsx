/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import FileView from './FileView';
import { ACTION_IDS } from '../../constants';
import { CreateOption } from '../../hooks/useCreateOptions';
import server from '../../mocks/server';
import { DOCS_SERVICE_NAME, HEALTH_PATH, REST_ENDPOINT } from '../constants';
import { healthCache } from '../hooks/useHealthInfo';
import { HealthResponse } from '../mocks/handleHealthRequest';
import { setup, spyOnUseCreateOptions } from '../utils/testUtils';

describe('FileView', () => {
	it('should show docs creation actions if docs is available', async () => {
		healthCache.reset();
		const createOptions: CreateOption[] = [];
		spyOnUseCreateOptions(createOptions);
		server.use(
			http.get<never, never, HealthResponse>(`${REST_ENDPOINT}${HEALTH_PATH}`, () =>
				HttpResponse.json({ dependencies: [{ name: DOCS_SERVICE_NAME, live: true }] })
			)
		);
		setup(<FileView />);
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
		setup(<FileView />);
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
});
