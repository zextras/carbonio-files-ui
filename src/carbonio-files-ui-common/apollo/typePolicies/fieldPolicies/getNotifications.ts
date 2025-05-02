/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { FieldPolicy } from '@apollo/client';

export const getNotificationsFieldPolicy: FieldPolicy = {
	keyArgs: false,
	merge(existing, incoming) {
		return {
			...incoming,
			last_seen: existing?.last_seen ?? incoming?.last_seen,
			notifications: [...(existing?.notifications ?? []), ...incoming.notifications]
		};
	}
};
