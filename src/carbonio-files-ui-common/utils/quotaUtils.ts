/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { debounce } from 'lodash';

import { QUOTA_CHANGED_EVENT } from '../../constants';

/**
 * Notify that the used quota may have changed.
 * The event is debounced so that bursts of operations (e.g. multiple uploads or deletions)
 * trigger a single refresh, 2s after the last call.
 */
export const debouncedRefreshQuota = debounce((): void => {
	window.dispatchEvent(new CustomEvent(QUOTA_CHANGED_EVENT));
}, 2000);
