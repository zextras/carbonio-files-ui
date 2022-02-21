/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import noop from 'lodash/noop';

export const UpdateQueryContext = React.createContext<(arg: any) => void>(() => noop);

export const FILES_ROUTE = 'files';
