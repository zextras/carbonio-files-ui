/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { noop } from 'lodash';

import * as actualModule from '../useCreateOptions';

export const useCreateOptions = (): ReturnType<typeof actualModule.useCreateOptions> => ({
	setCreateOptions: noop,
	removeCreateOptions: () => undefined
});
