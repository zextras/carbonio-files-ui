/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { HttpResponse, HttpResponseResolver } from 'msw';

import type { UserConfig } from '../apollo/userConfigVar';
import { SHARES_ENABLED_CONFIG_KEY } from '../constants';

const handleGetUserConfigRequest: HttpResponseResolver<never, never, UserConfig> = () =>
	HttpResponse.json({ [SHARES_ENABLED_CONFIG_KEY]: 'true' });

export default handleGetUserConfigRequest;
