/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { makeVar } from '@apollo/client';

import { VIEW_MODE, VIEW_MODE_DEFAULT } from '../constants';

export const viewModeVar = makeVar<(typeof VIEW_MODE)[keyof typeof VIEW_MODE]>(VIEW_MODE_DEFAULT);
