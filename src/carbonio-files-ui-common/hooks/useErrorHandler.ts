/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback, useEffect } from 'react';

import { ApolloError } from '@apollo/client';
import { SnackbarProps, useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { captureException } from '../../utils/utils';
import { ERROR_CODE } from '../constants';
import { decodeError } from '../utils/utils';

export type ErrorHandlerOptions = {
	type?: SnackbarProps['severity'];
	showSnackbar?: boolean;
};

type ErrorHandlerFn = (error: ApolloError | undefined) => void;

export function useErrorHandler(
	error: ApolloError | undefined,
	consoleErrorName: string,
	{ type = 'warning', showSnackbar = true }: ErrorHandlerOptions = {
		type: 'warning',
		showSnackbar: true
	}
): ErrorHandlerFn {
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();

	const handleError = useCallback(
		(err: ApolloError | undefined) => {
			if (err) {
				const isOverQuotaReached =
					err.graphQLErrors.length > 0 &&
					err.graphQLErrors[0].extensions?.errorCode === ERROR_CODE.overQuotaReached;
				captureException(new Error(`Failure on ${consoleErrorName}`));
				console.error(`${consoleErrorName}: `, { ...err });
				if (showSnackbar) {
					createSnackbar({
						disableAutoHide: isOverQuotaReached,
						key: new Date().toLocaleString(),
						severity: isOverQuotaReached ? 'error' : type,
						label:
							decodeError(err, t) ??
							t('errorCode.code', 'Something went wrong', { context: 'Generic' }),
						replace: true,
						hideButton: !isOverQuotaReached,
						actionLabel: isOverQuotaReached
							? t('snackbar.copyDocument.error.overQuota.actionLabel', 'Ok')
							: undefined
					});
				}
			}
		},
		[consoleErrorName, createSnackbar, showSnackbar, t, type]
	);

	useEffect(() => {
		handleError(error);
	}, [handleError, error]);

	return handleError;
}
