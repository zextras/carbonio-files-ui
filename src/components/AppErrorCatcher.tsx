/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { Catcher } from '@zextras/carbonio-design-system';

export const AppErrorCatcher = ({ children }: React.PropsWithChildren): React.JSX.Element => (
	<Catcher>{children}</Catcher>
);
