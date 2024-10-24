/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useIntegrations } from './useIntegrations';

export const IntegrationsRegisterer = (): null => {
	useIntegrations();
	return null;
};
