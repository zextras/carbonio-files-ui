/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { isCarbonioCEVar } from '../apollo/isCarbonioCEVar';
import { FILES_API_VERSION, FILES_API_VERSION_HEADER } from '../constants';

export const getFilesApiVersion = (): string =>
	(isCarbonioCEVar() ?? true) ? FILES_API_VERSION.ce : FILES_API_VERSION.advanced;

export const getFilesApiVersionHeaders = (): Record<string, string> => ({
	[FILES_API_VERSION_HEADER]: getFilesApiVersion()
});
