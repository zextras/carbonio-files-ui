/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { makeVar } from '@apollo/client';

import { NODES_SORT_DEFAULT } from '../constants';
import { NodeSort } from '../types/graphql/types';

export const nodeSortVar = makeVar<NodeSort>(NODES_SORT_DEFAULT);
