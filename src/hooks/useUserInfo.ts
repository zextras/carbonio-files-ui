/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useUserAccounts, useUserSettings } from '@zextras/carbonio-shell-ui';

const useUserInfo: () => { me: string; zimbraPrefTimeZoneId: string } = () => {
	// TODO: userAccounts return an array of accounts. I'm interest in the active one. For now I suppose it's the first
	const userAccounts = useUserAccounts();
	const settings = useUserSettings();

	return {
		me: userAccounts[0].id,
		zimbraPrefTimeZoneId: settings?.prefs?.zimbraPrefTimeZoneId as string
	};
};

export default useUserInfo;
