/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import type { QueryChip } from '@zextras/carbonio-shell-ui';
import { ACTION_TYPES as SHELL_ACTION_TYPES } from '@zextras/carbonio-shell-ui';
import noop from 'lodash/noop';

export const UpdateQueryContext = React.createContext<(arg: Array<QueryChip>) => void>(() => noop);

export const ACTION_TYPES: typeof SHELL_ACTION_TYPES = {
	...SHELL_ACTION_TYPES,
	FILES_ACTION: 'carbonio_files_action'
} as const;

export const ACTION_IDS = {
	SELECT_NODES: 'files-select-nodes',
	UPLOAD_FILE: 'upload-file',
	CREATE_FOLDER: 'create-folder',
	CREATE_DOCS_DOCUMENT: 'create-docs-document',
	CREATE_DOCS_SPREADSHEET: 'create-docs-spreadsheet',
	CREATE_DOCS_PRESENTATION: 'create-docs-presentation'
} as const;

export const FUNCTION_IDS = {
	UPLOAD_TO_TARGET_AND_GET_TARGET_ID: 'upload-to-target-and-get-target-id',
	GET_LINK: 'get-link'
} as const;

export const ACTIONS_TO_REMOVE_DUE_TO_PRODUCT_CONTEXT = [];
