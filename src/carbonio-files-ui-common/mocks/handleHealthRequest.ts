/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { HttpResponse, HttpResponseResolver } from 'msw';

export interface HealthResponse {
	dependencies: Array<{ name: string; live: boolean }>;
}

const handleHealthRequest: HttpResponseResolver<never, never, HealthResponse> = () =>
	HttpResponse.json({
		dependencies: [
			{ name: 'carbonio-preview', live: true },
			{ name: 'carbonio-docs-connector', live: true }
		]
	});

export default handleHealthRequest;
