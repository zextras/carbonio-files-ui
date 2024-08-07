/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { uploadToTargetModule } from '../carbonio-files-ui-common/utils/utils';
import { getComposePrefillMessageFunction } from '../integrations/functions';
import { captureException } from '../utils/utils';

export function useSendViaMail(): {
	sendViaMail: (nodeId: string) => void;
} {
	const createSnackbar = useSnackbar();
	const [t] = useTranslation();

	const sendViaMail = useCallback(
		(nodeId: string) => {
			uploadToTargetModule({ nodeId, targetModule: 'MAILS' }).then(
				(result) => {
					const { integratedFunction, available } = getComposePrefillMessageFunction();
					if (available) {
						integratedFunction({ aid: [result.attachmentId] });
					}
				},
				(reason) => {
					captureException(new Error(`Failure on uploadToTargetModule`));
					console.error(reason);
					createSnackbar({
						key: new Date().toLocaleString(),
						severity: 'warning',
						label: t('errorCode.code', 'Something went wrong', { context: 'Generic' }),
						replace: true,
						hideButton: true
					});
				}
			);
		},
		[createSnackbar, t]
	);

	return {
		sendViaMail
	};
}
