/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { FieldFunctionOptions, FieldPolicy } from '@apollo/client';

import type { UploadItem } from '../../../types/graphql/client-types';
import type {
	GetUploadItemQueryVariables,
	QueryGetUploadItemArgs
} from '../../../types/graphql/types';
import { uploadVar } from '../../uploadVar';

export const getUploadItemFieldPolicy: FieldPolicy<
	unknown,
	unknown,
	UploadItem | null,
	FieldFunctionOptions<Partial<QueryGetUploadItemArgs>, Partial<GetUploadItemQueryVariables>>
> = {
	read(_, options) {
		const id = options.args?.id;
		// return null to indicate the entry is not present instead of undefined
		// in order to tell the data has been searched, but it does not exist.
		// undefined means that data is incomplete or not queried yet, but in this case
		// if the data is not present it means it should not exist
		return (id && uploadVar()[id]) || null;
	}
};
