/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable no-var,vars-on-top */

import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { Account, AccountSettings } from '@zextras/carbonio-shell-ui';

import { NodeListItemType } from './carbonio-files-ui-common/types/common';

declare global {
	var apolloClient: ApolloClient<NormalizedCacheObject>;
	var mockedUserLogged: Account;
	var userSettings: AccountSettings;
	var clipboard: unknown[];

	const IS_SERVER: string;

	interface Window {
		draggedItem?: NodeListItemType[];
	}
}
