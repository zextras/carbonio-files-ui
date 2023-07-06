/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldFunctionOptions, FieldPolicy, Reference } from '@apollo/client';

import {
	GetCollaborationLinksQueryVariables,
	QueryGetCollaborationLinksArgs
} from '../../../types/graphql/types';

export const getCollaborationLinksFieldPolicy: FieldPolicy<
	Reference[],
	Reference[],
	Reference[],
	FieldFunctionOptions<
		Partial<QueryGetCollaborationLinksArgs>,
		Partial<GetCollaborationLinksQueryVariables>
	>
> = {
	merge(existing, incoming) {
		// always overwrite existing data with incoming one
		return incoming;
	}
};
