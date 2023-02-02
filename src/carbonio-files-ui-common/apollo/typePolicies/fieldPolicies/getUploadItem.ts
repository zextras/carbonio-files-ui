/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldFunctionOptions, FieldPolicy } from '@apollo/client';

import { UploadItem } from '../../../types/graphql/client-types';
import { uploadVar } from '../../uploadVar';

export const getUploadItemFieldPolicy: FieldPolicy<
	unknown,
	unknown,
	UploadItem,
	FieldFunctionOptions<{ id?: string }, { id?: string }>
> = {
	read(_, options) {
		const id = options.args?.id;
		if (id) {
			return uploadVar()[id];
		}
		return undefined;
	}
};
