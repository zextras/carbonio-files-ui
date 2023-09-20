/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ClientRequestInterceptor } from '@mswjs/interceptors/lib/interceptors/ClientRequest';
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/lib/interceptors/XMLHttpRequest';
import { SetupServerApi } from 'msw/node';

import handlers from './handlers';

const server = new SetupServerApi(
	// do not use FetchInterceptors
	// see https://github.com/mswjs/msw/issues/1563#issuecomment-1647642858
	[ClientRequestInterceptor, XMLHttpRequestInterceptor],
	...handlers
);
export default server;
