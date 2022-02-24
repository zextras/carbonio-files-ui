/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import type { QueryChip } from '@zextras/carbonio-shell-ui';
import noop from 'lodash/noop';

export const UpdateQueryContext = React.createContext<(arg: Array<QueryChip>) => void>(() => noop);
