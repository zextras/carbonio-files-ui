/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useState } from 'react';

import { Container, Responsive, Snackbar } from '@zextras/carbonio-design-system';
import { noop } from 'lodash';
import { useTranslation } from 'react-i18next';

import { ACTION_IDS, ACTION_TYPES } from '../../constants';
import { useCreateOptions } from '../../hooks/useCreateOptions';
import { useNavigation } from '../../hooks/useNavigation';
import { DISPLAYER_WIDTH, FILES_APP_ID, LIST_WIDTH, ROOTS } from '../constants';
import { ListContext } from '../contexts';
import useQueryParam from '../hooks/useQueryParam';
import { useUpload } from '../hooks/useUpload';
import { DocsType } from '../types/common';
import { getUploadAddTypeFromInput } from '../utils/uploadUtils';
import { getNewDocumentActionLabel, inputElement } from '../utils/utils';
import { Displayer } from './components/Displayer';
import FileList from './components/FileList';

const FileView: React.VFC = () => {
	const fileId = useQueryParam('file');
	const [t] = useTranslation();
	const { setCreateOptions, removeCreateOptions } = useCreateOptions();
	const [isEmpty, setIsEmpty] = useState(false);
	const { add } = useUpload();
	const { navigateToFolder } = useNavigation();

	const [showUploadSnackbar, setShowUploadSnackbar] = useState(false);

	const closeUploadSnackbar = useCallback(() => {
		setShowUploadSnackbar(false);
	}, []);

	const uploadSnackbarAction = useCallback(() => {
		navigateToFolder(ROOTS.LOCAL_ROOT);
	}, [navigateToFolder]);

	const inputElementOnchange = useCallback(
		(ev: Event) => {
			if (ev.currentTarget instanceof HTMLInputElement) {
				if (ev.currentTarget.files) {
					add(getUploadAddTypeFromInput(ev.currentTarget.files), ROOTS.LOCAL_ROOT);
					setShowUploadSnackbar(true);
				}
				// required to select 2 times the same file/files
				ev.currentTarget.value = '';
			}
		},
		[add]
	);
	useEffect(() => {
		setCreateOptions(
			{
				id: ACTION_IDS.UPLOAD_FILE,
				type: ACTION_TYPES.NEW,
				action: () => ({
					// FIXME: remove ts-ignore when shell will fix type of "type"
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					type: ACTION_TYPES.NEW,
					group: FILES_APP_ID,
					id: ACTION_IDS.UPLOAD_FILE,
					label: t('create.options.new.upload', 'Upload'),
					icon: 'CloudUploadOutline',
					click: noop,
					primary: true,
					disabled: true
				})
			},
			{
				id: ACTION_IDS.CREATE_FOLDER,
				type: ACTION_TYPES.NEW,
				action: () => ({
					id: ACTION_IDS.CREATE_FOLDER,
					group: FILES_APP_ID,
					type: ACTION_TYPES.NEW,
					label: t('create.options.new.folder', 'New Folder'),
					icon: 'FolderOutline',
					click: noop,
					disabled: true
				})
			},
			{
				id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
				type: ACTION_TYPES.NEW,
				action: () => ({
					id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
					group: FILES_APP_ID,
					type: ACTION_TYPES.NEW,
					label: t('create.options.new.document', 'New Document'),
					icon: 'FileTextOutline',
					click: noop,
					disabled: true,
					items: [
						{
							id: `${ACTION_IDS.CREATE_DOCS_DOCUMENT}-libre`,
							label: getNewDocumentActionLabel(t, DocsType.LIBRE_DOCUMENT),
							click: noop,
							disabled: true
						},
						{
							id: `${ACTION_IDS.CREATE_DOCS_DOCUMENT}-ms`,
							label: getNewDocumentActionLabel(t, DocsType.MS_DOCUMENT),
							click: noop,
							disabled: true
						}
					]
				})
			},
			{
				id: ACTION_IDS.CREATE_DOCS_SPREADSHEET,
				type: ACTION_TYPES.NEW,
				action: () => ({
					id: ACTION_IDS.CREATE_DOCS_SPREADSHEET,
					group: FILES_APP_ID,
					type: ACTION_TYPES.NEW,
					label: t('create.options.new.spreadsheet', 'New Spreadsheet'),
					icon: 'FileCalcOutline',
					click: noop,
					disabled: true,
					items: [
						{
							id: `${ACTION_IDS.CREATE_DOCS_SPREADSHEET}-libre`,
							label: getNewDocumentActionLabel(t, DocsType.LIBRE_SPREADSHEET),
							click: noop,
							disabled: true
						},
						{
							id: `${ACTION_IDS.CREATE_DOCS_SPREADSHEET}-ms`,
							label: getNewDocumentActionLabel(t, DocsType.MS_SPREADSHEET),
							click: noop,
							disabled: true
						}
					]
				})
			},
			{
				id: ACTION_IDS.CREATE_DOCS_PRESENTATION,
				type: ACTION_TYPES.NEW,
				action: () => ({
					id: ACTION_IDS.CREATE_DOCS_PRESENTATION,
					group: FILES_APP_ID,
					type: ACTION_TYPES.NEW,
					label: t('create.options.new.presentation', 'New Presentation'),
					icon: 'FilePresentationOutline',
					click: noop,
					disabled: true,
					items: [
						{
							id: `${ACTION_IDS.CREATE_DOCS_PRESENTATION}-libre`,
							label: getNewDocumentActionLabel(t, DocsType.LIBRE_PRESENTATION),
							click: noop,
							disabled: true
						},
						{
							id: `${ACTION_IDS.CREATE_DOCS_PRESENTATION}-ms`,
							label: getNewDocumentActionLabel(t, DocsType.MS_PRESENTATION),
							click: noop,
							disabled: true
						}
					]
				})
			}
		);

		return (): void => {
			removeCreateOptions(
				ACTION_IDS.UPLOAD_FILE,
				ACTION_IDS.CREATE_FOLDER,
				ACTION_IDS.CREATE_DOCS_DOCUMENT,
				ACTION_IDS.CREATE_DOCS_SPREADSHEET,
				ACTION_IDS.CREATE_DOCS_PRESENTATION
			);
			setCreateOptions({
				type: ACTION_TYPES.NEW,
				id: ACTION_IDS.UPLOAD_FILE,
				action: () => ({
					id: ACTION_IDS.UPLOAD_FILE,
					primary: true,
					group: FILES_APP_ID,
					// FIXME: remove ts-ignore when shell will fix type of "type"
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					type: ACTION_TYPES.NEW,
					label: t('create.options.new.upload', 'Upload'),
					icon: 'CloudUploadOutline',
					click: (event): void => {
						event && event.stopPropagation();
						inputElement.click();
						inputElement.onchange = inputElementOnchange;
					},
					disabled: false
				})
			});
		};
	}, [inputElementOnchange, removeCreateOptions, setCreateOptions, t]);

	return (
		<ListContext.Provider value={{ isEmpty, setIsEmpty }}>
			<Container
				orientation="row"
				crossAlignment="flex-start"
				mainAlignment="flex-start"
				width="fill"
				height="fill"
				background="gray5"
				borderRadius="none"
				maxHeight="100%"
			>
				<Responsive mode="desktop">
					<Container
						width={LIST_WIDTH}
						mainAlignment="flex-start"
						crossAlignment="unset"
						borderRadius="none"
						background="gray6"
					>
						<FileList fileId={fileId || ''} canUploadFile={false} />
					</Container>
					<Container
						width={DISPLAYER_WIDTH}
						mainAlignment="flex-start"
						crossAlignment="flex-start"
						borderRadius="none"
						style={{ maxHeight: '100%' }}
					>
						<Displayer translationKey="displayer.generic" />
					</Container>
				</Responsive>
				<Responsive mode="mobile">
					<FileList fileId={fileId || ''} canUploadFile={false} />
				</Responsive>
			</Container>
			<Snackbar
				open={showUploadSnackbar}
				onClose={closeUploadSnackbar}
				type="info"
				label={t('uploads.destination.home', "Upload occurred in Files' Home")}
				actionLabel={t('snackbar.upload.goToFolder', 'Go to folder')}
				onActionClick={uploadSnackbarAction}
			/>
		</ListContext.Provider>
	);
};

export default FileView;
