/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { HTTP_STATUS_CODE } from '../carbonio-files-ui-common/constants';
import { Node } from '../carbonio-files-ui-common/types/common';
import { DeepPick } from '../carbonio-files-ui-common/types/utils';
import {
	type UploadToTargetModuleError,
	uploadToTargetModule
} from '../carbonio-files-ui-common/utils/utils';
import { getComposePrefillMessageFunction } from '../integrations/functions';

type NodeItem = Node<
	'id' | 'name' | 'rootId' | 'permissions' | 'type' | 'flagged',
	'version' | 'mime_type'
> &
	DeepPick<Node<'parent'>, 'parent', 'id' | 'permissions' | '__typename'> &
	DeepPick<Node<'owner'>, 'owner', 'id'>;

type FileNodeItem = NodeItem & {
	size?: number;
	mime_type?: string;
};

export function useSendViaMail(): {
	sendViaMail: (node: FileNodeItem) => void;
} {
	const createSnackbar = useSnackbar();
	const [t] = useTranslation();

	const sendViaMail = useCallback(
		(node: FileNodeItem) => {
			uploadToTargetModule({
				nodeId: node.id,
				targetModule: 'MAILS'
			}).then(
				(result) => {
					const { integratedFunction, available } = getComposePrefillMessageFunction();

					if (!available) {
						return;
					}

					const attachment = {
						aid: result.attachmentId,
						filename: node.name,
						size: node?.size,
						isInline: false,
						contentType: node?.mime_type ?? 'application/octet-stream'
					};

					integratedFunction({
						attachments: [attachment]
					});
				},
				(reason: UploadToTargetModuleError) => {
					console.error(reason);
					if (reason.status === HTTP_STATUS_CODE.fileSizeExceeded) {
						createSnackbar({
							key: new Date().toLocaleString(),
							severity: 'warning',
							label: t(
								'snackbar.sendViaMail.error.fileSizeExceeded',
								'This file is too large to attach. Open a new e-mail and use Add from Files to share it as a Smart Link instead.'
							),
							replace: true,
							actionLabel: t('snackbar.sendViaMail.error.fileSizeExceeded.actionLabel', 'Ok'),
							disableAutoHide: true
						});
					} else {
						createSnackbar({
							key: new Date().toLocaleString(),
							severity: 'warning',
							label: t('errorCode.code', 'Something went wrong', { context: 'Generic' }),
							replace: true,
							hideButton: true
						});
					}
				}
			);
		},
		[createSnackbar, t]
	);

	return {
		sendViaMail
	};
}
