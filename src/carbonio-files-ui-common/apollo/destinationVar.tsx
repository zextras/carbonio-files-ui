/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { makeVar } from '@apollo/client';

export interface DestinationVar<T = unknown> {
	defaultValue: T | undefined;
	currentValue: T | undefined;
}

export const destinationVar = makeVar<DestinationVar>({
	defaultValue: undefined,
	currentValue: undefined
});
