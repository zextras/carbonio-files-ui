/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { HttpResponse, HttpResponseResolver } from 'msw';

import { FILES_API_VERSION_HEADER } from '../constants';
import { FilesApiServerVersions } from '../utils/filesApiVersion';

export type VersionsResponse = FilesApiServerVersions & { name: string; header: string };

export const versionsResponse = (server: FilesApiServerVersions): VersionsResponse => ({
	name: 'carbonio-files',
	header: FILES_API_VERSION_HEADER,
	...server
});

const handleVersionsRequest: HttpResponseResolver<never, never, VersionsResponse> = () =>
	HttpResponse.json(
		versionsResponse({ edition: 'ce', current: '3.0.14', oldestSupported: '3.0.14' })
	);

export default handleVersionsRequest;
