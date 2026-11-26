/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { makeVar } from '@apollo/client';

export const isCarbonioCEVar = makeVar<boolean | undefined>(undefined);
