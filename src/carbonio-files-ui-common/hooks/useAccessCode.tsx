/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useMemo, useState } from 'react';

import { generateAccessCode } from '../utils/utils';

export function useAccessCode(
	isAccessCodeEnabledInitialState: boolean,
	newAccessCodeValueInitialState?: string | null
): {
	newAccessCodeValue: string;
	isAccessCodeEnabled: boolean;
	toggleAccessCode: () => void;
	regenerateAccessCode: () => void;
	reset: (accessCode?: string | null) => void;
} {
	const newAccessCodeValueInitialStateFallback = useMemo(() => generateAccessCode(), []);

	const [newAccessCodeValue, setNewAccessCodeValue] = useState(
		newAccessCodeValueInitialState ?? newAccessCodeValueInitialStateFallback
	);

	const regenerateAccessCode = useCallback(() => {
		setNewAccessCodeValue(generateAccessCode());
	}, []);

	const [isAccessCodeEnabled, setIsAccessCodeEnabled] = useState(isAccessCodeEnabledInitialState);
	const toggleAccessCode = useCallback(() => {
		setIsAccessCodeEnabled((prevState) => !prevState);
	}, []);

	const reset = useCallback((accessCode?: string | null) => {
		if (accessCode) {
			setNewAccessCodeValue(accessCode);
			setIsAccessCodeEnabled(true);
		} else {
			setNewAccessCodeValue(generateAccessCode());
			setIsAccessCodeEnabled(false);
		}
	}, []);

	return {
		newAccessCodeValue,
		isAccessCodeEnabled,
		toggleAccessCode,
		regenerateAccessCode,
		reset
	};
}
