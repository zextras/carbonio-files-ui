/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { soapFetch as shellSoapFetch } from '@zextras/carbonio-shell-ui';

import { RequestName } from '../carbonio-files-ui-common/types/network';

export const soapFetch = <Req, Res>(request: RequestName, args: Req): Promise<Res> =>
	new Promise<Res>((resolve, reject) => {
		shellSoapFetch<Req, Res>(request, {
			_jsns: 'urn:zimbraMail',
			...args
		})
			.then(resolve)
			.catch(reject);
	});
