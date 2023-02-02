/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldFunctionOptions, FieldPolicy } from '@apollo/client';

import {
	File,
	GetVersionsQueryVariables,
	QueryGetVersionsArgs
} from '../../../types/graphql/types';

export const getVersionsFieldPolicy: FieldPolicy<
	File[] | null,
	File[] | null,
	File[] | null,
	FieldFunctionOptions<Partial<QueryGetVersionsArgs>, Partial<GetVersionsQueryVariables>>
> = {
	merge(existing, incoming) {
		// always overwrite existing data with incoming one
		return incoming;
	}
};
