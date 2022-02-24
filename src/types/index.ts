/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { QueryChip } from '@zextras/carbonio-shell-ui';

import { AdvancedFilters } from '../carbonio-files-ui-common/types/common';

export interface AdvancedSearchChip extends QueryChip {
	label: never;
	value: never;
	varKey: keyof Omit<AdvancedFilters, 'keywords'>;
}
