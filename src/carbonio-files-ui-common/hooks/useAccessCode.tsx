/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useMemo, useState } from 'react';

import { useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

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
	const createSnackbar = useSnackbar();
	const [t] = useTranslation();

	const newAccessCodeValueInitialStateFallback = useMemo(() => generateAccessCode(), []);

	const [newAccessCodeValue, setNewAccessCodeValue] = useState(
		newAccessCodeValueInitialState ?? newAccessCodeValueInitialStateFallback
	);

	const regenerateAccessCode = useCallback(() => {
		const newAccessCode = generateAccessCode();
		setNewAccessCodeValue(newAccessCode);
		createSnackbar({
			key: newAccessCode,
			severity: 'info',
			label: t('snackbar.accessCode.regenerate', 'New access code generated'),
			replace: true,
			hideButton: true
		});
	}, [createSnackbar, t]);

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
