/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { HttpResponse, HttpResponseResolver } from 'msw';

export interface LicenseResponse {
	licensed: boolean;
}

const handleLicenseRequest: HttpResponseResolver<never, never, LicenseResponse> = () =>
	HttpResponse.json({ licensed: true });

export default handleLicenseRequest;
