/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useFeatureFlag as useShellFeatureFlag } from '@zextras/carbonio-shell-ui';
import type { FeatureFlags } from '@zextras/carbonio-shell-ui';

export const useFeatureFlag: <K extends keyof FeatureFlags>(key: K) => boolean | undefined = (
	key
) => useShellFeatureFlag(key);
