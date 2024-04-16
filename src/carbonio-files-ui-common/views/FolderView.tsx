/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Container, Responsive, Text } from '@zextras/carbonio-design-system';
import { map, filter, last } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { ContextualMenuProps } from './components/ContextualMenu';
import { Displayer } from './components/Displayer';
import { EmptySpaceFiller } from './components/EmptySpaceFiller';
import { List } from './components/List';
import { SortingComponent } from './components/SortingComponent';
import { ACTION_IDS, ACTION_TYPES } from '../../constants';
import { useActiveNode } from '../../hooks/useActiveNode';
import { CreateOption, useCreateOptions } from '../../hooks/useCreateOptions';
import { DISPLAYER_WIDTH, DOCS_EXTENSIONS, FILES_APP_ID, LIST_WIDTH, ROOTS } from '../constants';
import { ListContext, ListHeaderActionContext } from '../contexts';
import { useCreateFolderMutation } from '../hooks/graphql/mutations/useCreateFolderMutation';
import { useGetChildrenQuery } from '../hooks/graphql/queries/useGetChildrenQuery';
import { useGetPermissionsQuery } from '../hooks/graphql/queries/useGetPermissionsQuery';
import { useCreateModal } from '../hooks/modals/useCreateModal';
import { useCreateDocsFile } from '../hooks/useCreateDocsFile';
import { useHealthInfo } from '../hooks/useHealthInfo';
import useQueryParam from '../hooks/useQueryParam';
import { useUpload } from '../hooks/useUpload';
import { DocsType, NodeListItemType, URLParams } from '../types/common';
import { NonNullableListItem, Unwrap } from '../types/utils';
import { canCreateFile, canCreateFolder, canUploadFile } from '../utils/ActionsFactory';
import { getUploadAddTypeFromInput } from '../utils/uploadUtils';
import { getNewDocumentActionLabel, inputElement, isFolder, takeIfNotEmpty } from '../utils/utils';

const FolderView: React.VFC = () => {
	const { rootId } = useParams<URLParams>();
	const { setActiveNode } = useActiveNode();
	const folderId = useQueryParam('folder');
	const [newFile, setNewFile] = useState<DocsType | undefined>();
	const [t] = useTranslation();
	const { setCreateOptions, removeCreateOptions } = useCreateOptions();
	const [isEmpty, setIsEmpty] = useState(false);

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

	// folder creation
	const [newFolder, setNewFolder] = useState(false);

	const { createFolder } = useCreateFolderMutation();

	const createFolderCallback = useCallback(
		(_parentId, newName) => {
			if (currentFolder?.getNode && isFolder(currentFolder.getNode)) {
				return createFolder(currentFolder.getNode, newName).then((result) => {
					result.data && setActiveNode(result.data.createFolder.id);
					return result;
				});
			}
			return Promise.reject(new Error('cannot create folder on invalid node'));
		},
		[createFolder, currentFolder?.getNode, setActiveNode]
	);

	const resetNewFolder = useCallback(() => {
		setNewFolder(false);
	}, []);

	const { openCreateModal: openCreateFolderModal } = useCreateModal(
		t('folder.create.modal.title', 'Create new folder'),
		t('folder.create.modal.input.label.name', 'Folder name'),
		createFolderCallback,
		undefined,
		resetNewFolder
	);

	useEffect(() => {
		if (newFolder) {
			openCreateFolderModal(currentFolderId);
		}
	}, [currentFolderId, newFolder, openCreateFolderModal]);

	const createFolderAction = useCallback((event) => {
		event?.stopPropagation();
		setNewFolder(true);
	}, []);

	const createDocsFile = useCreateDocsFile();

	const createDocsFileAction = useCallback(
		(_parentId, newName) => {
			if (currentFolder?.getNode && isFolder(currentFolder.getNode) && newFile) {
				return createDocsFile(currentFolder?.getNode, newName, newFile).then((result) => {
					result?.data?.getNode && setActiveNode(result.data.getNode.id);
					return result;
				});
			}
			return Promise.reject(new Error('cannot create folder: invalid node or file type'));
		},
		[createDocsFile, currentFolder?.getNode, newFile, setActiveNode]
	);

	const resetNewFile = useCallback(() => {
		setNewFile(undefined);
	}, [setNewFile]);

	const documentGenericType = useMemo(
		() => (last(newFile?.split('_')) || 'document').toLowerCase(),
		[newFile]
	);

	const { openCreateModal: openCreateFileModal } = useCreateModal(
		// be careful: the following key is not parsed by i18next-extract, it must be added manually to the en.json file
		/* i18next-extract-disable-next-line */
		t(`docs.create.modal.title.${documentGenericType}`, `Create new ${documentGenericType}`),
		// be careful: the following key is not parsed by i18next-extract, it must be added manually to the en.json file
		/* i18next-extract-disable-next-line */
		t(`docs.create.modal.input.label.name.${documentGenericType}`, `${documentGenericType} Name`),
		createDocsFileAction,
		newFile ? (): React.JSX.Element => <Text>{`.${DOCS_EXTENSIONS[newFile]}`}</Text> : undefined,
		resetNewFile
	);

	useEffect(() => {
		if (newFile) {
			openCreateFileModal(currentFolderId);
		}
	}, [openCreateFileModal, currentFolderId, newFile]);

	const createDocsAction = useCallback<
		(docsType: DocsType) => (event: React.SyntheticEvent | KeyboardEvent) => void
	>(
		(docsType) => () => {
			setNewFile(docsType);
		},
		[]
	);

	const { canUseDocs } = useHealthInfo();

	const actions = useMemo(
		(): ContextualMenuProps['actions'] => [
			{
				id: ACTION_IDS.CREATE_FOLDER,
				label: t('create.options.new.folder', 'New folder'),
				icon: 'FolderOutline',
				onClick: createFolderAction,
				disabled: !isCanCreateFolder
			},
			...(canUseDocs
				? [
						{
							id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
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
		const createActions = map<ContextualMenuProps['actions'][number], CreateOption>(
			actions,
			(action) => ({
				type: ACTION_TYPES.NEW,
				id: action.id,
				action: () => ({
					group: FILES_APP_ID,
					...action
				})
			})
		);

		setCreateOptions(
			{
				type: ACTION_TYPES.NEW,
				id: ACTION_IDS.UPLOAD_FILE,
				action: () => ({
					id: ACTION_IDS.UPLOAD_FILE,
					primary: true,
					group: FILES_APP_ID,
					label: t('create.options.new.upload', 'Upload'),
					icon: 'CloudUploadOutline',
					onClick: (event: React.SyntheticEvent | KeyboardEvent): void => {
						event && event.stopPropagation();
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

	const nodes = useMemo<NodeListItemType[]>(() => {
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
		() => <SortingComponent />,
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

	const listContextValue = useMemo(() => ({ isEmpty, setIsEmpty }), [isEmpty]);

	return (
		<ListContext.Provider value={listContextValue}>
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
						{ListComponent}
					</Container>
					<Container
						width={DISPLAYER_WIDTH}
						mainAlignment="flex-start"
						crossAlignment="flex-start"
						borderRadius="none"
						style={{ maxHeight: '100%' }}
					>
						<Displayer translationKey="displayer.folder" />
					</Container>
				</Responsive>
				<Responsive mode="mobile">{ListComponent}</Responsive>
			</Container>
		</ListContext.Provider>
	);
};

export default FolderView;
