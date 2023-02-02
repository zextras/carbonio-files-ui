/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldFunctionOptions, FieldPolicy } from '@apollo/client';
import { filter } from 'lodash';

import { UploadItem } from '../../../types/graphql/client-types';
import { uploadVar } from '../../uploadVar';

export const getUploadItemsFieldPolicy: FieldPolicy<
	unknown,
	unknown,
	UploadItem[],
	FieldFunctionOptions<Record<'parentId', string | null>, Record<'parentId', string | null>>
> = {
	read(_, options) {
		const parentId = options.args?.parentId;
		if (parentId !== undefined) {
			const result = filter(uploadVar(), (uploadItem) => uploadItem.parentId === parentId);
			return result;
		}
		return Object.values(uploadVar());
	}
};
