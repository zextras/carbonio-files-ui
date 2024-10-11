/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { User } from '../carbonio-files-ui-common/types/graphql/types';

export const LOGGED_USER_ACCOUNT = {
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

export const LOGGED_USER = {
	id: LOGGED_USER_ACCOUNT.id,
	full_name: LOGGED_USER_ACCOUNT.name,
	email: 'logged.user@email.test',
	__typename: 'User'
} satisfies User;
