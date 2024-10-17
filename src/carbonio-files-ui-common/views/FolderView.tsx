/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import { Text } from '@zextras/carbonio-design-system';
import { filter, map, noop } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Displayer } from './components/Displayer';
import { EmptySpaceFiller } from './components/EmptySpaceFiller';
import { List } from './components/List';
import { SortingComponent } from './components/SortingComponent';
import { ViewModeComponent } from './components/ViewModeComponent';
import { ViewLayout } from './ViewLayout';
import { ACTION_IDS, ACTION_TYPES } from '../../constants';
import { useActiveNode } from '../../hooks/useActiveNode';
import { NewAction, useCreateOptions } from '../../hooks/useCreateOptions';
import { DOCS_EXTENSIONS, FILES_APP_ID, ROOTS } from '../constants';
import { ListHeaderActionContext } from '../contexts';
import { useCreateFolderMutation } from '../hooks/graphql/mutations/useCreateFolderMutation';
import { useGetChildrenQuery } from '../hooks/graphql/queries/useGetChildrenQuery';
import { useGetPermissionsQuery } from '../hooks/graphql/queries/useGetPermissionsQuery';
import { useCreateModal } from '../hooks/modals/useCreateModal';
import { useCreateDocsFile } from '../hooks/useCreateDocsFile';
import { useHealthInfo } from '../hooks/useHealthInfo';
import useQueryParam from '../hooks/useQueryParam';
import { useUpload } from '../hooks/useUpload';
import { DocsType, URLParams } from '../types/common';
import { NonNullableListItem, Unwrap } from '../types/utils';
import { canCreateFile, canCreateFolder, canUploadFile } from '../utils/ActionsFactory';
import { getUploadAddTypeFromInput } from '../utils/uploadUtils';
import {
	getDocumentGenericType,
	getNewDocumentActionLabel,
	inputElement,
	isFolder,
	takeIfNotEmpty
} from '../utils/utils';

const FolderView = (): React.JSX.Element => {
	const { rootId } = useParams<URLParams>();
	const { setActiveNode } = useActiveNode();
	const folderId = useQueryParam('folder');
	const [t] = useTranslation();
	const { setCreateOptions, removeCreateOptions } = useCreateOptions();

	const { add } = useUpload();

	const currentFolderId = useMemo(
		() => takeIfNotEmpty(folderId) ?? takeIfNotEmpty(rootId) ?? ROOTS.LOCAL_ROOT,
		[folderId, rootId]
	);

	const inputElementOnchange = useCallback(
		(ev: Event) => {
			if (ev.currentTarget instanceof HTMLInputElement) {
				if (ev.currentTarget.files) {
					add(getUploadAddTypeFromInput(ev.currentTarget.files), currentFolderId);
				}
				// required to select 2 times the same file/files
				ev.currentTarget.value = '';
			}
		},
		[add, currentFolderId]
	);

	const { data: currentFolder, loading, hasMore, loadMore } = useGetChildrenQuery(currentFolderId);

	const { data: permissionsData } = useGetPermissionsQuery(currentFolderId);

	const isCanUploadFile = useMemo(
		() => !!permissionsData?.getNode && canUploadFile(permissionsData.getNode),
		[permissionsData]
	);

	const isCanCreateFolder = useMemo(
		() => !!permissionsData?.getNode && canCreateFolder(permissionsData.getNode),
		[permissionsData]
	);

	const isCanCreateFile = useMemo(
		() => !!permissionsData?.getNode && canCreateFile(permissionsData.getNode),
		[permissionsData]
	);

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
			event?.stopPropagation();
			openCreateFolderModal({
				title: t('folder.create.modal.title', 'Create new folder'),
				inputLabel: t('folder.create.modal.input.label.name', 'Folder name'),
				createAction: createFolderCallback,
				parentFolderId: currentFolderId
			});
		},
		[createFolderCallback, currentFolderId, openCreateFolderModal, t]
	);

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
				inputLabel: t(
					`docs.create.modal.input.label.name.${documentGenericType}`,
					`${documentGenericType} Name`
				),
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

	const actions = useMemo<NewAction[]>(
		() => [
			{
				id: ACTION_IDS.CREATE_FOLDER,
				label: t('create.options.new.folder', 'New folder'),
				icon: 'FolderOutline',
				execute: createFolderAction,
				disabled: !isCanCreateFolder
			},
			...(canUseDocs
				? [
						{
							id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
							execute: noop,
							label: t('create.options.new.document', 'New document'),
							icon: 'FileTextOutline',
							disabled: !isCanCreateFile,
							items: [
								{
									id: `${ACTION_IDS.CREATE_DOCS_DOCUMENT}-libre`,
									label: getNewDocumentActionLabel(t, DocsType.LIBRE_DOCUMENT),
									onClick: createDocsAction(DocsType.LIBRE_DOCUMENT),
									disabled: !isCanCreateFile
								},
								{
									id: `${ACTION_IDS.CREATE_DOCS_DOCUMENT}-ms`,
									label: getNewDocumentActionLabel(t, DocsType.MS_DOCUMENT),
									onClick: createDocsAction(DocsType.MS_DOCUMENT),
									disabled: !isCanCreateFile
								}
							]
						},
						{
							id: ACTION_IDS.CREATE_DOCS_SPREADSHEET,
							execute: noop,
							label: t('create.options.new.spreadsheet', 'New spreadsheet'),
							icon: 'FileCalcOutline',
							disabled: !isCanCreateFile,
							items: [
								{
									id: `${ACTION_IDS.CREATE_DOCS_SPREADSHEET}-libre`,
									label: getNewDocumentActionLabel(t, DocsType.LIBRE_SPREADSHEET),
									onClick: createDocsAction(DocsType.LIBRE_SPREADSHEET),
									disabled: !isCanCreateFile
								},
								{
									id: `${ACTION_IDS.CREATE_DOCS_SPREADSHEET}-ms`,
									label: getNewDocumentActionLabel(t, DocsType.MS_SPREADSHEET),
									onClick: createDocsAction(DocsType.MS_SPREADSHEET),
									disabled: !isCanCreateFile
								}
							]
						},
						{
							id: ACTION_IDS.CREATE_DOCS_PRESENTATION,
							execute: noop,
							label: t('create.options.new.presentation', 'New presentation'),
							icon: 'FilePresentationOutline',
							disabled: !isCanCreateFile,
							items: [
								{
									id: `${ACTION_IDS.CREATE_DOCS_PRESENTATION}-libre`,
									label: getNewDocumentActionLabel(t, DocsType.LIBRE_PRESENTATION),
									onClick: createDocsAction(DocsType.LIBRE_PRESENTATION),
									disabled: !isCanCreateFile
								},
								{
									id: `${ACTION_IDS.CREATE_DOCS_PRESENTATION}-ms`,
									label: getNewDocumentActionLabel(t, DocsType.MS_PRESENTATION),
									onClick: createDocsAction(DocsType.MS_PRESENTATION),
									disabled: !isCanCreateFile
								}
							]
						}
					]
				: [])
		],
		[canUseDocs, createDocsAction, createFolderAction, isCanCreateFile, isCanCreateFolder, t]
	);

	useEffect(() => {
		const createActions = map(actions, (action) => ({
			type: ACTION_TYPES.NEW,
			id: action.id,
			action: () => ({
				group: FILES_APP_ID,
				...action
			})
		}));

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
					execute: (event: React.SyntheticEvent | KeyboardEvent): void => {
						event?.stopPropagation();
						inputElement.click();
						inputElement.onchange = inputElementOnchange;
					},
					disabled: !isCanUploadFile
				})
			},
			...createActions
		);

		return (): void => {
			removeCreateOptions(...map(createActions, (action) => action.id));
		};
	}, [
		actions,
		createFolderAction,
		inputElementOnchange,
		isCanCreateFile,
		isCanCreateFolder,
		isCanUploadFile,
		removeCreateOptions,
		setCreateOptions,
		t
	]);

	const nodes = useMemo(() => {
		if (
			currentFolder?.getNode &&
			isFolder(currentFolder.getNode) &&
			currentFolder.getNode.children?.nodes &&
			currentFolder.getNode.children.nodes.length > 0
		) {
			const { nodes: childrenNodes } = currentFolder.getNode.children;
			return filter<Unwrap<typeof childrenNodes>, NonNullableListItem<typeof childrenNodes>>(
				childrenNodes,
				(child): child is NonNullableListItem<typeof childrenNodes> => child != null
			);
		}
		return [];
	}, [currentFolder]);

	const listHeaderActionValue = useMemo<React.ContextType<typeof ListHeaderActionContext>>(
		() => (
			<>
				<ViewModeComponent />
				<SortingComponent />
			</>
		),
		[]
	);

	const ListComponent = useMemo(
		() => (
			<ListHeaderActionContext.Provider value={listHeaderActionValue}>
				<List
					nodes={nodes}
					folderId={currentFolderId}
					hasMore={hasMore}
					loadMore={loadMore}
					loading={loading}
					canUpload={isCanUploadFile}
					fillerWithActions={<EmptySpaceFiller actions={actions} />}
					emptyListMessage={t('empty.folder.hint', "It looks like there's nothing here.")}
					mainList={isCanUploadFile}
				/>
			</ListHeaderActionContext.Provider>
		),
		[
			actions,
			currentFolderId,
			hasMore,
			isCanUploadFile,
			listHeaderActionValue,
			loadMore,
			loading,
			nodes,
			t
		]
	);

	return (
		<ViewLayout
			listComponent={ListComponent}
			displayerComponent={<Displayer translationKey="displayer.folder" />}
		/>
	);
};

export default FolderView;
