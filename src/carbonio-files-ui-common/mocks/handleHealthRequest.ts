/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { HttpResponse, HttpResponseResolver } from 'msw';

import { DOCS_SERVICE_NAME, PREVIEW_SERVICE_NAME } from '../constants';

export interface HealthResponse {
	dependencies: Array<{ name: string; live: boolean }>;
}

const handleHealthRequest: HttpResponseResolver<never, never, HealthResponse> = () =>
	HttpResponse.json({
		dependencies: [
			{ name: PREVIEW_SERVICE_NAME, live: true },
			{ name: DOCS_SERVICE_NAME, live: true }
		]
	});

export default handleHealthRequest;
