/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useUserAccount, useUserSettings } from '@zextras/carbonio-shell-ui';

const useUserInfo: () => { me: string; zimbraPrefTimeZoneId: string } = () => {
	const userAccount = useUserAccount();
	const settings = useUserSettings();

	return {
		me: userAccount.id,
		zimbraPrefTimeZoneId: settings?.prefs?.zimbraPrefTimeZoneId as string
	};
};

export default useUserInfo;
