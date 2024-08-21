/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { makeVar } from '@apollo/client';

import { VIEW_MODE, VIEW_MODE_DEFAULT } from '../constants';

export type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];

export const viewModeVar = makeVar<ViewMode>(VIEW_MODE_DEFAULT);
