/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Account, getUserAccount as shellGetUserAccount, report } from '@zextras/carbonio-shell-ui';

export const captureException = report;

export function getUserAccount(): Account {
	return shellGetUserAccount();
}
