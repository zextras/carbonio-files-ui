/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Container, Snackbar } from '@zextras/carbonio-design-system';
import { noop } from 'lodash';
import { useTranslation } from 'react-i18next';

import { Displayer } from './components/Displayer';
import { SearchList } from './components/SearchList';
import { ViewLayout } from './ViewLayout';
import { ACTION_IDS, ACTION_TYPES } from '../../constants';
import { NewAction, useCreateOptions } from '../../hooks/useCreateOptions';
import { useNavigation } from '../../hooks/useNavigation';
import { FILES_APP_ID, ROOTS, VIEW_MODE } from '../constants';
import { ListContext } from '../contexts';
import { useHealthInfo } from '../hooks/useHealthInfo';
import { useUpload } from '../hooks/useUpload';
import { DocsType } from '../types/common';
import { getUploadAddTypeFromInput } from '../utils/uploadUtils';
import { getNewDocumentActionLabel, inputElement } from '../utils/utils';

interface SearchViewProps {
	resultsHeader?: React.ReactNode;
}

export const SearchView: React.VFC<SearchViewProps> = ({ resultsHeader }) => {
	const [t] = useTranslation();
	const { setCreateOptions, removeCreateOptions } = useCreateOptions();
	const { navigateToFolder } = useNavigation();

	const { add } = useUpload();

	const [showUploadSnackbar, setShowUploadSnackbar] = useState(false);
	const [searchExecuted, setSearchExecuted] = useState(false);

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
		setCreateOptions<NewAction>(
			{
				type: ACTION_TYPES.NEW,
				id: ACTION_IDS.UPLOAD_FILE,
				action: () => ({
					id: ACTION_IDS.UPLOAD_FILE,
					primary: true,
					group: FILES_APP_ID,
					label: t('create.options.new.upload', 'Upload'),
					icon: 'CloudUploadOutline',
					execute: (event): void => {
						event?.stopPropagation();
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
					id: ACTION_IDS.CREATE_FOLDER,
					group: FILES_APP_ID,
					label: t('create.options.new.folder', 'New folder'),
					icon: 'FolderOutline',
					disabled: true,
					execute: noop
				})
			},
			...(canUseDocs
				? [
						{
							type: ACTION_TYPES.NEW,
							id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
							action: () => ({
								group: FILES_APP_ID,
								id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
								label: t('create.options.new.document', 'New document'),
								icon: 'FileTextOutline',
								disabled: true,
								execute: noop,
								items: [
									{
										id: `${ACTION_IDS.CREATE_DOCS_DOCUMENT}-libre`,
										label: getNewDocumentActionLabel(t, DocsType.LIBRE_DOCUMENT),
										disabled: true
									},
									{
										id: `${ACTION_IDS.CREATE_DOCS_DOCUMENT}-ms`,
										label: getNewDocumentActionLabel(t, DocsType.MS_DOCUMENT),
										disabled: true
									}
								]
							})
						},
						{
							type: ACTION_TYPES.NEW,
							id: ACTION_IDS.CREATE_DOCS_SPREADSHEET,
							action: () => ({
								group: FILES_APP_ID,
								id: ACTION_IDS.CREATE_DOCS_SPREADSHEET,
								label: t('create.options.new.spreadsheet', 'New spreadsheet'),
								icon: 'FileCalcOutline',
								disabled: true,
								execute: noop,
								items: [
									{
										id: `${ACTION_IDS.CREATE_DOCS_SPREADSHEET}-libre`,
										label: getNewDocumentActionLabel(t, DocsType.LIBRE_SPREADSHEET),
										disabled: true
									},
									{
										id: `${ACTION_IDS.CREATE_DOCS_SPREADSHEET}-ms`,
										label: getNewDocumentActionLabel(t, DocsType.MS_SPREADSHEET),
										disabled: true
									}
								]
							})
						},
						{
							type: ACTION_TYPES.NEW,
							id: ACTION_IDS.CREATE_DOCS_PRESENTATION,
							action: () => ({
								group: FILES_APP_ID,
								id: ACTION_IDS.CREATE_DOCS_PRESENTATION,
								label: t('create.options.new.presentation', 'New presentation'),
								icon: 'FilePresentationOutline',
								disabled: true,
								execute: noop,
								items: [
									{
										id: `${ACTION_IDS.CREATE_DOCS_PRESENTATION}-libre`,
										label: getNewDocumentActionLabel(t, DocsType.LIBRE_PRESENTATION),
										disabled: true
									},
									{
										id: `${ACTION_IDS.CREATE_DOCS_PRESENTATION}-ms`,
										label: getNewDocumentActionLabel(t, DocsType.MS_PRESENTATION),
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
				ACTION_IDS.CREATE_FOLDER,
				ACTION_IDS.CREATE_DOCS_DOCUMENT,
				ACTION_IDS.CREATE_DOCS_SPREADSHEET,
				ACTION_IDS.CREATE_DOCS_PRESENTATION
			);
		};
	}, [
		canUseDocs,
		inputElementOnchange,
		navigateToFolder,
		removeCreateOptions,
		setCreateOptions,
		t
	]);

	const listContextValue = useMemo<Partial<React.ContextType<typeof ListContext>>>(
		() => ({
			queryCalled: searchExecuted,
			setQueryCalled: setSearchExecuted,
			viewMode: VIEW_MODE.list
		}),
		[searchExecuted]
	);

	return (
		<Container minHeight={0} maxHeight="100%" mainAlignment="flex-start">
			{resultsHeader}
			<ViewLayout
				listComponent={<SearchList />}
				displayerComponent={
					<Displayer translationKey="displayer.search" icons={['SearchOutline']} />
				}
				listContextValue={listContextValue}
				listWidth={'25%'}
				displayerWidth={'75%'}
			/>
			<Snackbar
				open={showUploadSnackbar}
				onClose={closeUploadSnackbar}
				type="info"
				label={t('uploads.destination.home', "Upload occurred in Files' Home")}
				actionLabel={t('snackbar.upload.goToFolder', 'Go to folder')}
				onActionClick={uploadSnackbarAction}
			/>
		</Container>
	);
};
