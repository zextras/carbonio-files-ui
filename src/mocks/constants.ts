/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Account, AccountSettings } from '@zextras/carbonio-shell-ui';

export const LOGGED_USER: Account = {
	displayName: '',
	identities: undefined,
	rights: {
		targets: []
	},
	signatures: { signature: [] },
	id: 'logged-user-id',
	name: 'Logged User Name'
};

export const USER_SETTINGS: AccountSettings = {
	attrs: {},
	props: [],
	prefs: {
		zimbraPrefTimeZoneId: 'UTC'
	}
};
