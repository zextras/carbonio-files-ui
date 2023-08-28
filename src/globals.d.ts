/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { NodeListItemType } from './carbonio-files-ui-common/types/common';

declare global {
	interface Window {
		draggedItem?: NodeListItemType[];
	}
}
