/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback } from 'react';

import { destinationVar, DestinationVar } from '../apollo/destinationVar';

interface DestinationVarManager<T> {
	setCurrent: (value: DestinationVar<T>['currentValue']) => void;
	setDefault: (value: DestinationVar<T>['defaultValue']) => void;
	resetCurrent: () => void;
	resetAll: () => void;
}

export const useDestinationVarManager = <T = string>(): DestinationVarManager<T> => {
	const setCurrent = useCallback<DestinationVarManager<T>['setCurrent']>((value) => {
		destinationVar({ ...destinationVar(), currentValue: value });
	}, []);

	const setDefault = useCallback<DestinationVarManager<T>['setDefault']>((value) => {
		destinationVar({ ...destinationVar(), defaultValue: value });
	}, []);

	const resetCurrent = useCallback<DestinationVarManager<T>['resetCurrent']>(() => {
		destinationVar({ ...destinationVar(), currentValue: destinationVar().defaultValue });
	}, []);

	const resetAll = useCallback<DestinationVarManager<T>['resetAll']>(() => {
		destinationVar({ currentValue: undefined, defaultValue: undefined });
	}, []);

	return {
		setCurrent,
		setDefault,
		resetCurrent,
		resetAll
	};
};
