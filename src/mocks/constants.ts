/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Account } from '@zextras/carbonio-shell-ui';

export const LOGGED_USER: Account = {
	displayName: '',
	identities: {
		identity: [
			{
				id: 'logged-user-identity-default',
				name: 'DEFAULT',
				_attrs: {}
			}
		]
	},
	rights: {
		targets: []
	},
	signatures: { signature: [] },
	id: 'logged-user-id',
	name: 'Logged User Name'
};
