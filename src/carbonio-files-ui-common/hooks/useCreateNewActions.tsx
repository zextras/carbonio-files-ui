/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useMemo } from 'react';

import { DropdownItem, Text } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { useCreateFolderMutation } from './graphql/mutations/useCreateFolderMutation';
import { useCreateModal } from './modals/useCreateModal';
import { useCreateDocsFile } from './useCreateDocsFile';
import { useHealthInfo } from './useHealthInfo';
import { ACTION_IDS, ACTION_TYPES } from '../../constants';
import { useActiveNode } from '../../hooks/useActiveNode';
import { NewAction, useCreateOptions } from '../../hooks/useCreateOptions';
import { DOCS_EXTENSIONS, FILES_APP_ID } from '../constants';
import { DocsType } from '../types/common';
import { GetChildrenQuery } from '../types/graphql/types';
import { getDocumentGenericType, getNewDocumentActionLabel, isFolder } from '../utils/utils';

export const useCreateNewActions = (
	currentFolderId: string,
	currentFolder: GetChildrenQuery | undefined,
	canCreateFolder: boolean,
	canCreateFile: boolean
): DropdownItem[] => {
	const { setActiveNode } = useActiveNode();
	const { setCreateOptions, removeCreateOptions } = useCreateOptions();
	const [t] = useTranslation();

	const { createFolder } = useCreateFolderMutation();

	const createFolderCallback = useCallback(
		(_parentId: string, newName: string) => {
			if (currentFolder?.getNode && isFolder(currentFolder.getNode)) {
				return createFolder(currentFolder.getNode, newName).then((result) => {
					if (result.data) {
						setActiveNode(result.data.createFolder.id);
					}
					return result;
				});
			}
			return Promise.reject(new Error('cannot create folder on invalid node'));
		},
		[createFolder, currentFolder?.getNode, setActiveNode]
	);

	const { openCreateModal: openCreateFolderModal } = useCreateModal();

	const createFolderAction = useCallback(
		(event: React.SyntheticEvent | KeyboardEvent) => {
			event.stopPropagation();
			openCreateFolderModal({
				title: t('folder.create.modal.title', 'Create new folder'),
				inputLabel: `${t('folder.create.modal.input.label.name', 'Folder name')}*`,
				createAction: createFolderCallback,
				parentFolderId: currentFolderId
			});
		},
		[createFolderCallback, currentFolderId, openCreateFolderModal, t]
	);

	const createFolderNewActions = useMemo<NewAction[]>(() => {
		if (canCreateFolder) {
			return [
				{
					id: ACTION_IDS.CREATE_FOLDER,
					label: t('create.options.new.folder', 'New folder'),
					icon: 'FolderOutline',
					execute: createFolderAction
				}
			];
		}
		return [];
	}, [createFolderAction, canCreateFolder, t]);

	const createDocsFile = useCreateDocsFile();

	const createDocsFileAction = useCallback(
		(docsType: DocsType) => async (_parentId: string, newName: string) => {
			if (currentFolder?.getNode && isFolder(currentFolder.getNode)) {
				const result = await createDocsFile(currentFolder.getNode, newName, docsType);
				if (result?.data?.getNode) {
					setActiveNode(result.data.getNode.id);
				}
				return result ?? {};
			}
			return Promise.reject(new Error('cannot create folder: invalid node or file type'));
		},
		[createDocsFile, currentFolder?.getNode, setActiveNode]
	);

	const { openCreateModal: openCreateFileModal } = useCreateModal();

	const createDocsAction = useCallback<
		(docsType: DocsType) => (event: React.SyntheticEvent | KeyboardEvent) => void
	>(
		(docsType) => () => {
			const documentGenericType = getDocumentGenericType(docsType);

			openCreateFileModal({
				title: t(
					`docs.create.modal.title.${documentGenericType}`,
					`Create new ${documentGenericType}`
				),
				inputLabel: `${t(
					`docs.create.modal.input.label.name.${documentGenericType}`,
					`${documentGenericType} Name`
				)}*`,
				createAction: createDocsFileAction(docsType),
				inputCustomIcon: docsType
					? (): React.JSX.Element => <Text>{`.${DOCS_EXTENSIONS[docsType]}`}</Text>
					: undefined,
				parentFolderId: currentFolderId
			});
		},
		[createDocsFileAction, currentFolderId, openCreateFileModal, t]
	);

	const { canUseDocs } = useHealthInfo();

	const createDocsFileNewActions = useMemo<NewAction[]>(() => {
		if (canUseDocs && canCreateFile) {
			return [
				{
					id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
					execute: () => undefined,
					label: t('create.options.new.document', 'New document'),
					icon: 'FileTextOutline',
					items: [
						{
							id: `${ACTION_IDS.CREATE_DOCS_DOCUMENT}-libre`,
							label: getNewDocumentActionLabel(t, DocsType.LIBRE_DOCUMENT),
							onClick: createDocsAction(DocsType.LIBRE_DOCUMENT)
						},
						{
							id: `${ACTION_IDS.CREATE_DOCS_DOCUMENT}-ms`,
							label: getNewDocumentActionLabel(t, DocsType.MS_DOCUMENT),
							onClick: createDocsAction(DocsType.MS_DOCUMENT)
						}
					]
				},
				{
					id: ACTION_IDS.CREATE_DOCS_SPREADSHEET,
					execute: () => undefined,
					label: t('create.options.new.spreadsheet', 'New spreadsheet'),
					icon: 'FileCalcOutline',
					items: [
						{
							id: `${ACTION_IDS.CREATE_DOCS_SPREADSHEET}-libre`,
							label: getNewDocumentActionLabel(t, DocsType.LIBRE_SPREADSHEET),
							onClick: createDocsAction(DocsType.LIBRE_SPREADSHEET)
						},
						{
							id: `${ACTION_IDS.CREATE_DOCS_SPREADSHEET}-ms`,
							label: getNewDocumentActionLabel(t, DocsType.MS_SPREADSHEET),
							onClick: createDocsAction(DocsType.MS_SPREADSHEET)
						}
					]
				},
				{
					id: ACTION_IDS.CREATE_DOCS_PRESENTATION,
					execute: () => undefined,
					label: t('create.options.new.presentation', 'New presentation'),
					icon: 'FilePresentationOutline',
					items: [
						{
							id: `${ACTION_IDS.CREATE_DOCS_PRESENTATION}-libre`,
							label: getNewDocumentActionLabel(t, DocsType.LIBRE_PRESENTATION),
							onClick: createDocsAction(DocsType.LIBRE_PRESENTATION)
						},
						{
							id: `${ACTION_IDS.CREATE_DOCS_PRESENTATION}-ms`,
							label: getNewDocumentActionLabel(t, DocsType.MS_PRESENTATION),
							onClick: createDocsAction(DocsType.MS_PRESENTATION)
						}
					]
				}
			];
		}
		return [];
	}, [canUseDocs, createDocsAction, canCreateFile, t]);

	const actions = useMemo(
		() => [...createFolderNewActions, ...createDocsFileNewActions],
		[createDocsFileNewActions, createFolderNewActions]
	);

	useEffect(() => {
		const createActions = actions.map((action) => ({
			type: ACTION_TYPES.NEW,
			id: action.id,
			action: () => ({
				group: FILES_APP_ID,
				...action
			})
		}));

		setCreateOptions<NewAction>(...createActions);

		return (): void => {
			removeCreateOptions(...createActions.map((action) => action.id));
		};
	}, [actions, removeCreateOptions, setCreateOptions]);

	return useMemo(
		() =>
			actions.map(({ execute, group: _group, primary: _primary, ...action }) => ({
				onClick: execute,
				...action
			})),
		[actions]
	);
};
