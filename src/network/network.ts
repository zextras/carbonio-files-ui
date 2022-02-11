/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// eslint-disable-next-line import/no-unresolved
import { soapFetch as shellSoapFetch } from '@zextras/carbonio-shell-ui';

export const soapFetch = <Req, Res>(request: string, args: Req): Promise<Res> =>
	new Promise<Res>((resolve, reject) => {
		shellSoapFetch<Req, Res>(request, {
			_jsns: 'urn:zimbraMail',
			...args
		})
			.then(resolve)
			.catch(reject);
	});
