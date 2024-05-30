/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useUserAccount } from '@zextras/carbonio-shell-ui';
import { useTranslation } from 'react-i18next';

export const useUserInfo = (): { me: string; locale: string | undefined } => {
	const userAccount = useUserAccount();
	const { i18n } = useTranslation();

	return {
		me: userAccount.id,
		locale: i18n.language
	};
};
