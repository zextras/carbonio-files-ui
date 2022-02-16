/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// eslint-disable-next-line import/no-unresolved
import { getAction, Action } from '@zextras/carbonio-shell-ui';

import { OneOrMany } from '../carbonio-files-ui-common/types/utils';

export type Contact = {
	address: string;
	firstName: string;
	middleName: string;
	email: {
		email: {
			mail: string;
		};
	};
};

export function getMailToAction(contacts: OneOrMany<Contact>): {
	action: Action | undefined;
	available: boolean;
} {
	const [action, available] = getAction(
		'contact-list',
		'mail-to',
		contacts instanceof Array ? contacts : [contacts]
	);

	return {
		action,
		available
	};
}
