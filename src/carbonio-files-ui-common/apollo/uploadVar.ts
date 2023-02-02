/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { makeVar } from '@apollo/client';

import { UploadItem } from '../types/graphql/client-types';

export type UploadRecord = { [id: string]: UploadItem };

export const uploadVar = makeVar<UploadRecord>({});

export interface UploadFunctions {
	abort: () => void;
	retry: (file: UploadItem) => UploadFunctions['abort'];
}

export const uploadFunctionsVar = makeVar<{ [id: string]: UploadFunctions }>({});
