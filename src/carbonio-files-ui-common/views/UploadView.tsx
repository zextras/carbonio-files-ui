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
import { useUpload } from '../hooks/useUpload';
import { DocsType } from '../types/common';
import { getUploadAddTypeFromInput } from '../utils/uploadUtils';
import { getNewDocumentActionLabel, inputElement } from '../utils/utils';
import { UploadDisplayer } from './components/UploadDisplayer';
import { UploadList } from './components/UploadList';

const UploadView: React.VFC = () => {
	const [t] = useTranslation();
	const { setCreateOptions, removeCreateOptions } = useCreateOptions();
	const { navigateToFolder } = useNavigation();

	const { add } = useUpload();

	const [showUploadSnackbar, setShowUploadSnackbar] = useState(false);

	const [isEmpty, setIsEmpty] = useState(true);

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
				type: ACTION_TYPES.NEW,
				id: ACTION_IDS.UPLOAD_FILE,
				action: () => ({
					// FIXME: remove ts-ignore when shell will fix type of "type"
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					type: ACTION_TYPES.NEW,
					group: FILES_APP_ID,
					id: ACTION_IDS.UPLOAD_FILE,
					primary: true,
					label: t('create.options.new.upload', 'Upload'),
					icon: 'CloudUploadOutline',
					click: (event): void => {
						event && event.stopPropagation();
						inputElement.click();
						inputElement.onchange = inputElementOnchange;
					},
					disabled: false
				})
			},
			{
				type: ACTION_TYPES.NEW,
				id: ACTION_IDS.CREATE_FOLDER,
				action: () => ({
					type: ACTION_TYPES.NEW,
					group: FILES_APP_ID,
					id: ACTION_IDS.CREATE_FOLDER,
					label: t('create.options.new.folder', 'New Folder'),
					icon: 'FolderOutline',
					disabled: true,
					click: noop
				})
			},
			{
				type: ACTION_TYPES.NEW,
				id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
				action: () => ({
					type: ACTION_TYPES.NEW,
					group: FILES_APP_ID,
					id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
					label: t('create.options.new.document', 'New Document'),
					icon: 'FileTextOutline',
					disabled: true,
					click: noop,
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
				type: ACTION_TYPES.NEW,
				id: ACTION_IDS.CREATE_DOCS_SPREADSHEET,
				action: () => ({
					type: ACTION_TYPES.NEW,
					group: FILES_APP_ID,
					id: ACTION_IDS.CREATE_DOCS_SPREADSHEET,
					label: t('create.options.new.spreadsheet', 'New Spreadsheet'),
					icon: 'FileCalcOutline',
					disabled: true,
					click: noop,
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
				type: ACTION_TYPES.NEW,
				id: ACTION_IDS.CREATE_DOCS_PRESENTATION,
				action: () => ({
					type: ACTION_TYPES.NEW,
					group: FILES_APP_ID,
					id: ACTION_IDS.CREATE_DOCS_PRESENTATION,
					label: t('create.options.new.presentation', 'New Presentation'),
					icon: 'FilePresentationOutline',
					disabled: true,
					click: noop,
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
				ACTION_IDS.CREATE_FOLDER,
				ACTION_IDS.CREATE_DOCS_DOCUMENT,
				ACTION_IDS.CREATE_DOCS_SPREADSHEET,
				ACTION_IDS.CREATE_DOCS_PRESENTATION
			);
		};
	}, [inputElementOnchange, navigateToFolder, removeCreateOptions, setCreateOptions, t]);

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
						<UploadList />
					</Container>
					<Container
						width={DISPLAYER_WIDTH}
						mainAlignment="flex-start"
						crossAlignment="flex-start"
						borderRadius="none"
						style={{ maxHeight: '100%' }}
					>
						<UploadDisplayer
							translationKey="displayer.uploads"
							icons={['ImageOutline', 'FileAddOutline', 'FilmOutline']}
						/>
					</Container>
				</Responsive>
				<Responsive mode="mobile">
					<UploadList />
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

export default UploadView;
