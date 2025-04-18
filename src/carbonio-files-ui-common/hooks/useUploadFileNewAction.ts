/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useEffect, useMemo } from 'react';

import { useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { useUpload } from './useUpload';
import { ACTION_IDS, ACTION_TYPES } from '../../constants';
import { NewAction, useCreateOptions } from '../../hooks/useCreateOptions';
import { useNavigation } from '../../hooks/useNavigation';
import { FILES_APP_ID, ROOTS } from '../constants';
import { getUploadAddTypeFromInput } from '../utils/uploadUtils';
import { inputElement } from '../utils/utils';

export const useUploadFileNewAction = (isAvailable: boolean, destinationId: string): void => {
	const { add } = useUpload();
	const [t] = useTranslation();
	const { setCreateOptions, removeCreateOptions } = useCreateOptions();
	const createSnackbar = useSnackbar();
	const { navigateToFolder } = useNavigation();

	const inputElementOnchange = useCallback(
		(ev: Event) => {
			if (ev.currentTarget instanceof HTMLInputElement) {
				if (ev.currentTarget.files) {
					add(getUploadAddTypeFromInput(ev.currentTarget.files), destinationId);
					if (destinationId === ROOTS.LOCAL_ROOT) {
						createSnackbar({
							key: new Date().toLocaleString(),
							severity: 'info',
							label: t('uploads.destination.home', "Upload started in Files' Home"),
							actionLabel: t('snackbar.upload.goToFolder', 'Go to folder'),
							onActionClick: () => {
								navigateToFolder(ROOTS.LOCAL_ROOT);
							},
							replace: true
						});
					}
				}
				// required to select 2 times the same file/files
				ev.currentTarget.value = '';
			}
		},
		[add, createSnackbar, destinationId, navigateToFolder, t]
	);

	const uploadAction = useMemo(
		() => ({
			type: ACTION_TYPES.NEW,
			id: ACTION_IDS.UPLOAD_FILE,
			action: () =>
				({
					group: FILES_APP_ID,
					id: ACTION_IDS.UPLOAD_FILE,
					primary: true,
					label: t('create.options.new.upload', 'Upload'),
					icon: 'CloudUploadOutline',
					execute: (event): void => {
						event?.stopPropagation();
						inputElement.click();
						inputElement.onchange = inputElementOnchange;
					}
				}) satisfies NewAction
		}),
		[inputElementOnchange, t]
	);

	useEffect(() => {
		if (isAvailable) {
			setCreateOptions<NewAction>(uploadAction);
			return (): void => undefined;
		}

		removeCreateOptions(uploadAction.id);
		return (): void => {
			setCreateOptions<NewAction>(uploadAction);
		};
	}, [isAvailable, removeCreateOptions, setCreateOptions, uploadAction]);
};
