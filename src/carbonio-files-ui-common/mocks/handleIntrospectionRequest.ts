/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLContext, MockedRequest, ResponseResolver } from 'msw';

const handleIntrospectionRequest: ResponseResolver<
	MockedRequest,
	GraphQLContext<Record<string, unknown>>
> = (req, res, ctx) => res(ctx.data({}));

export default handleIntrospectionRequest;
