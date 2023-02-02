/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useEffect, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useMemoCompare<T>(
	next: T,
	compare: (previous: T | undefined, next: T) => boolean
): T {
	// Ref for storing previous value
	const previousRef = useRef<T>();
	const previous = previousRef.current;
	// Pass previous and next value to compare function
	// to determine whether to consider them equal.
	const isEqual = compare(previous, next);
	// If not equal update previousRef to next value.
	// We only update if not equal so that this hook continues to return
	// the same old value if compare keeps returning true.
	useEffect(() => {
		if (!isEqual) {
			previousRef.current = next;
		}
	});
	// Finally, if equal then return the previous value
	if (previous == null) {
		return next;
	}
	return isEqual ? previous : next;
}
