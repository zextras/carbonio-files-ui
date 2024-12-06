/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { JSNS, soapFetch as shellSoapFetch } from '@zextras/carbonio-shell-ui';

import { RequestName } from '../carbonio-files-ui-common/types/network';

export const soapFetch = <Req, Res extends Record<string, unknown>>(
	request: RequestName,
	args: Req,
	nameSpaceValue: (typeof JSNS)[keyof typeof JSNS] = JSNS.mail
): Promise<Res> =>
	shellSoapFetch<Req, Res>(request, {
		_jsns: nameSpaceValue,
		...args
	});
