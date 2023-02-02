/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { makeVar } from '@apollo/client';

import { NodeListItemType } from '../types/common';

export const draggedItemsVar = makeVar<NodeListItemType[] | null>(null);
