/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { SelectItem } from '@zextras/carbonio-design-system';
import type { QueryChip } from '@zextras/carbonio-search-ui';
import {
	ACTION_TYPES as SHELL_ACTION_TYPES,
	EMAIL_VALIDATION_REGEX
} from '@zextras/carbonio-shell-ui';
import { noop } from 'lodash';

import { SharePermission } from '../carbonio-files-ui-common/types/graphql/types';

export const UpdateQueryContext = React.createContext<(arg: Array<QueryChip>) => void>(() => noop);

export const ACTION_TYPES: typeof SHELL_ACTION_TYPES & { FILES_ACTION: string } = {
	...SHELL_ACTION_TYPES,
	FILES_ACTION: 'carbonio_files_action'
} as const;

export const ACTION_IDS = {
	UPLOAD_FILE: 'upload-file',
	CREATE_FOLDER: 'create-folder',
	CREATE_DOCS_DOCUMENT: 'create-docs-document',
	CREATE_DOCS_SPREADSHEET: 'create-docs-spreadsheet',
	CREATE_DOCS_PRESENTATION: 'create-docs-presentation'
} as const;

export const FUNCTION_IDS = {
	UPLOAD_TO_TARGET_AND_GET_TARGET_ID: 'upload-to-target-and-get-target-id',
	GET_LINK: 'get-link',
	UPDATE_LINK: 'update-link',
	GET_NODE: 'get-node',
	SELECT_NODES: 'select-nodes'
} as const;

export const EMAIL_REGEXP = EMAIL_VALIDATION_REGEX;

export const UPDATE_VIEW_EVENT = 'updateView';
export const RESET_SELECTION_EVENT = 'resetSelection';
export const QUOTA_CHANGED_EVENT = 'carbonio-files-ui:quota-changed';

export const EMPTY_ITEM: SelectItem<SharePermission> = {
	label: 'EMPTY',
	value: 'EMPTY' as SharePermission
};
