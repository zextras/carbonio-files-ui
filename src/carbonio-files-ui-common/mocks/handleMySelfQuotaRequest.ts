/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { HttpResponse, HttpResponseResolver } from 'msw';

export interface MySelfQuotaResponse {
	used: number;
	limit: number;
}

const handleMySelfQuotaRequest: HttpResponseResolver<never, never, MySelfQuotaResponse> = () => {
	const used = faker.number.int({ max: 10000 });
	const limit = used * 2;

	return HttpResponse.json({
		used,
		limit
	});
};

export default handleMySelfQuotaRequest;
