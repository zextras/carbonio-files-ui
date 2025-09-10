/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { HttpResponse, HttpResponseResolver } from 'msw';

const handleDownloadMultipleCheckRequest: HttpResponseResolver<never, never> = () =>
	HttpResponse.json({}, { status: 413 });

export default handleDownloadMultipleCheckRequest;
