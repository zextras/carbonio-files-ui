/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useEffect } from 'react';

import { ApolloError } from '@apollo/client';
import { SnackbarProps, useSnackbar } from '@zextras/carbonio-design-system';
import { first } from 'lodash';
import { useTranslation } from 'react-i18next';

import { captureException } from '../../utils/utils';
import { ERROR_CODE } from '../constants';
import { decodeError } from '../utils/utils';

export type ErrorHandlerOptions = {
	type?: SnackbarProps['severity'];
	showSnackbar?: boolean;
};

export function useErrorHandler(
	error: ApolloError | undefined,
	consoleErrorName: string,
	{ type = 'warning', showSnackbar = true }: ErrorHandlerOptions = {
		type: 'warning',
		showSnackbar: true
	}
): void {
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();

	useEffect(() => {
		if (error) {
			const isOverQuotaReached =
				first(error.graphQLErrors)?.extensions?.errorCode === ERROR_CODE.overQuotaReached;
			captureException(new Error(`Failure on ${consoleErrorName}`));
			console.error(`${consoleErrorName}: `, { ...error });
			if (showSnackbar) {
				createSnackbar({
					disableAutoHide: isOverQuotaReached,
					key: new Date().toLocaleString(),
					severity: isOverQuotaReached ? 'error' : type,
					label:
						decodeError(error, t) ??
						t('errorCode.code', 'Something went wrong', { context: 'Generic' }),
					replace: true,
					hideButton: !isOverQuotaReached,
					actionLabel: isOverQuotaReached
						? t('snackbar.error.overQuota.actionLabel', 'Ok')
						: undefined
				});
			}
		}
	}, [consoleErrorName, createSnackbar, error, showSnackbar, t, type]);
}
