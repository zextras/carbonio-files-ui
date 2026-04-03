/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as shell from '@zextras/carbonio-shell-ui';

import { LOGGED_USER_ACCOUNT } from '../../src/mocks/constants';

export const useUserAccount: typeof shell.useUserAccount = () => LOGGED_USER_ACCOUNT;
export const getUserAccount: typeof shell.getUserAccount = () => LOGGED_USER_ACCOUNT;
export const ACTION_TYPES: Partial<typeof shell.ACTION_TYPES> = {
	NEW: 'new'
};

export const getIntegratedFunction: typeof shell.getIntegratedFunction = <T,>() => [
	((): void => undefined) as T,
	false
];

export const updatePrimaryBadge: typeof shell.updatePrimaryBadge = () => undefined;

export const EMAIL_VALIDATION_REGEX =
	// eslint-disable-next-line no-control-regex,max-len
	/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

export const registerActions: typeof shell.registerActions = () => undefined;
export const registerFunctions: typeof shell.registerFunctions = () => undefined;
export const addRoute: typeof shell.addRoute = () => '';
export const removeActions: typeof shell.removeActions = () => undefined;
const noop = (): void => undefined;
export const useTracker: typeof shell.useTracker = () => ({
	capture: noop,
	enableTracker: noop,
	reset: noop
});
export const useIsCarbonioCE: typeof shell.useIsCarbonioCE = () => false;
export const useFeatureFlag = vi.fn((): boolean => false);
export const useAuthenticated: typeof shell.useAuthenticated = () => true;
export const useIntegratedFunction: typeof shell.useIntegratedFunction = <T,>() => [
	((): void => undefined) as T,
	false
];
