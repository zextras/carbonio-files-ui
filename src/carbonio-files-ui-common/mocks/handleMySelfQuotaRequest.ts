/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { ResponseResolver, RestContext, RestRequest } from 'msw';

export interface MySelfQuotaResponse {
	used: number;
	limit: number;
}

const handleMySelfQuotaRequest: ResponseResolver<RestRequest, RestContext, MySelfQuotaResponse> = (
	req,
	res,
	ctx
) => {
	const used = faker.number.int({ max: 10000 });
	const limit = used * 2;

	return res(
		ctx.json({
			used,
			limit
		})
	);
};

export default handleMySelfQuotaRequest;
