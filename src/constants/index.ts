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

export const ACTION_TYPES = {
	...SHELL_ACTION_TYPES,
	FILES_ACTION: 'carbonio_files_action'
};

export const ACTION_IDS = {
	SELECT_NODES: 'files-select-nodes'
};
