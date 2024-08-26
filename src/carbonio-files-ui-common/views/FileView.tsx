/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Snackbar } from '@zextras/carbonio-design-system';
import { noop } from 'lodash';
import { useTranslation } from 'react-i18next';

import { Displayer } from './components/Displayer';
import FileList from './components/FileList';
import { ViewLayout } from './ViewLayout';
import { ACTION_IDS, ACTION_TYPES } from '../../constants';
import { useCreateOptions } from '../../hooks/useCreateOptions';
import { useNavigation } from '../../hooks/useNavigation';
import { FILES_APP_ID, ROOTS, VIEW_MODE } from '../constants';
import { ListContext } from '../contexts';
import { useHealthInfo } from '../hooks/useHealthInfo';
import useQueryParam from '../hooks/useQueryParam';
import { useUpload } from '../hooks/useUpload';
import { DocsType } from '../types/common';
import { getUploadAddTypeFromInput } from '../utils/uploadUtils';
import { getNewDocumentActionLabel, inputElement } from '../utils/utils';

const FileView: React.VFC = () => {
	const fileId = useQueryParam('file');
	const [t] = useTranslation();
	const { setCreateOptions, removeCreateOptions } = useCreateOptions();
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

	const { canUseDocs } = useHealthInfo();

	useEffect(() => {
		setCreateOptions(
			{
				id: ACTION_IDS.UPLOAD_FILE,
				type: ACTION_TYPES.NEW,
				action: () => ({
					group: FILES_APP_ID,
					id: ACTION_IDS.UPLOAD_FILE,
					label: t('create.options.new.upload', 'Upload'),
					icon: 'CloudUploadOutline',
					onClick: noop,
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
					label: t('create.options.new.folder', 'New folder'),
					icon: 'FolderOutline',
					onClick: noop,
					disabled: true
				})
			},
			...(canUseDocs
				? [
						{
							id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
							type: ACTION_TYPES.NEW,
							action: () => ({
								id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
								group: FILES_APP_ID,
								label: t('create.options.new.document', 'New document'),
								icon: 'FileTextOutline',
								onClick: noop,
								disabled: true,
								items: [
									{
										id: `${ACTION_IDS.CREATE_DOCS_DOCUMENT}-libre`,
										label: getNewDocumentActionLabel(t, DocsType.LIBRE_DOCUMENT),
										onClick: noop,
										disabled: true
									},
									{
										id: `${ACTION_IDS.CREATE_DOCS_DOCUMENT}-ms`,
										label: getNewDocumentActionLabel(t, DocsType.MS_DOCUMENT),
										onClick: noop,
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
								label: t('create.options.new.spreadsheet', 'New Spreadsheet'),
								icon: 'FileCalcOutline',
								onClick: noop,
								disabled: true,
								items: [
									{
										id: `${ACTION_IDS.CREATE_DOCS_SPREADSHEET}-libre`,
										label: getNewDocumentActionLabel(t, DocsType.LIBRE_SPREADSHEET),
										onClick: noop,
										disabled: true
									},
									{
										id: `${ACTION_IDS.CREATE_DOCS_SPREADSHEET}-ms`,
										label: getNewDocumentActionLabel(t, DocsType.MS_SPREADSHEET),
										onClick: noop,
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
								label: t('create.options.new.presentation', 'New presentation'),
								icon: 'FilePresentationOutline',
								onClick: noop,
								disabled: true,
								items: [
									{
										id: `${ACTION_IDS.CREATE_DOCS_PRESENTATION}-libre`,
										label: getNewDocumentActionLabel(t, DocsType.LIBRE_PRESENTATION),
										onClick: noop,
										disabled: true
									},
									{
										id: `${ACTION_IDS.CREATE_DOCS_PRESENTATION}-ms`,
										label: getNewDocumentActionLabel(t, DocsType.MS_PRESENTATION),
										onClick: noop,
										disabled: true
									}
								]
							})
						}
					]
				: [])
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
					label: t('create.options.new.upload', 'Upload'),
					icon: 'CloudUploadOutline',
					onClick: (event): void => {
						event && event.stopPropagation();
						inputElement.click();
						inputElement.onchange = inputElementOnchange;
					},
					disabled: false
				})
			});
		};
	}, [canUseDocs, inputElementOnchange, removeCreateOptions, setCreateOptions, t]);

	const listContextValue = useMemo<Partial<React.ContextType<typeof ListContext>>>(
		() => ({
			viewMode: VIEW_MODE.list
		}),
		[]
	);
	return (
		<>
			<ViewLayout
				listComponent={<FileList fileId={fileId ?? ''} canUploadFile={false} />}
				displayerComponent={<Displayer translationKey="displayer.generic" />}
				listContextValue={listContextValue}
			/>
			<Snackbar
				open={showUploadSnackbar}
				onClose={closeUploadSnackbar}
				type="info"
				label={t('uploads.destination.home', "Upload occurred in Files' Home")}
				actionLabel={t('snackbar.upload.goToFolder', 'Go to folder')}
				onActionClick={uploadSnackbarAction}
			/>
		</>
	);
};

export default FileView;
