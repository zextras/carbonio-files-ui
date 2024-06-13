/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useContext } from 'react';

import { PreviewsManagerContext } from '@zextras/carbonio-ui-preview';
import { PreviewManagerContextType } from '@zextras/carbonio-ui-preview/lib/preview/PreviewManager';

export const usePreview = (): PreviewManagerContextType => useContext(PreviewsManagerContext);
