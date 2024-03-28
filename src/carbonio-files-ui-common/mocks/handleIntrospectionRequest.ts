/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLResponseResolver, HttpResponse } from 'msw';

const handleIntrospectionRequest: GraphQLResponseResolver = () => HttpResponse.json({ data: {} });

export default handleIntrospectionRequest;
