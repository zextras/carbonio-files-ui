/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useLocation } from 'react-router-dom';

export default function useQueryParam(name: string, defaultValue?: string): string | undefined {
	return new URLSearchParams(useLocation().search).get(name) || defaultValue;
}
