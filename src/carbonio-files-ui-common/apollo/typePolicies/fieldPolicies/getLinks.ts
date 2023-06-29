/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldFunctionOptions, FieldPolicy, Reference } from '@apollo/client';

import { GetLinksQueryVariables, QueryGetLinksArgs } from '../../../types/graphql/types';

export const getLinksFieldPolicy: FieldPolicy<
	Reference[],
	Reference[],
	Reference[],
	FieldFunctionOptions<Partial<QueryGetLinksArgs>, Partial<GetLinksQueryVariables>>
> = {
	merge(existing, incoming) {
		// always overwrite existing data with incoming one
		return incoming;
	}
};
