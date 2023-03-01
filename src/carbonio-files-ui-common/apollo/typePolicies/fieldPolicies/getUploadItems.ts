/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { FieldFunctionOptions, FieldPolicy } from '@apollo/client';
import { filter } from 'lodash';

import type { UploadItem } from '../../../types/graphql/client-types';
import type {
	GetUploadItemsQueryVariables,
	QueryGetUploadItemsArgs
} from '../../../types/graphql/types';
import { uploadVar } from '../../uploadVar';

export const getUploadItemsFieldPolicy: FieldPolicy<
	unknown,
	unknown,
	UploadItem[],
	FieldFunctionOptions<QueryGetUploadItemsArgs, GetUploadItemsQueryVariables>
> = {
	read(_, options) {
		const parentId = options.args?.parentId;
		if (parentId !== undefined) {
			return filter(uploadVar(), (uploadItem) => uploadItem.parentId === parentId);
		}
		return Object.values(uploadVar());
	}
};
