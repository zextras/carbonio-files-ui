/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { JSNS } from '@zextras/carbonio-shell-ui';
import { RawErrorSoapResponse, RawSoapResponse, soapFetchV2 } from '@zextras/carbonio-ui-soap-lib';

import { RequestName } from '../carbonio-files-ui-common/types/network';

export function isRawErrorSoapResponse(
	item: RawSoapResponse<Record<string, unknown>>
): item is RawErrorSoapResponse {
	return item.Body.Fault !== undefined;
}

export const soapFetch = <Req, Res extends Record<string, unknown>>(
	request: RequestName,
	args: Req,
	nameSpaceValue: (typeof JSNS)[keyof typeof JSNS] = JSNS.mail
): Promise<RawSoapResponse<Res>> =>
	soapFetchV2<Req, Res>(request, {
		_jsns: nameSpaceValue,
		...args
	});
