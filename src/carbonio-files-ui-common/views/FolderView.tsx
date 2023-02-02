/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Container, Responsive } from '@zextras/carbonio-design-system';
import { Action } from '@zextras/carbonio-shell-ui';
import { map, filter, last } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { ACTION_IDS, ACTION_TYPES } from '../../constants';
import { useActiveNode } from '../../hooks/useActiveNode';
import { CreateOptionsContent, useCreateOptions } from '../../hooks/useCreateOptions';
import { DISPLAYER_WIDTH, FILES_APP_ID, LIST_WIDTH, ROOTS } from '../constants';
import { ListContext, ListHeaderActionContext } from '../contexts';
import { useCreateFolderMutation } from '../hooks/graphql/mutations/useCreateFolderMutation';
import { useGetChildrenQuery } from '../hooks/graphql/queries/useGetChildrenQuery';
import { useGetPermissionsQuery } from '../hooks/graphql/queries/useGetPermissionsQuery';
import { useCreateModal } from '../hooks/modals/useCreateModal';
import { useCreateDocsFile } from '../hooks/useCreateDocsFile';
import useQueryParam from '../hooks/useQueryParam';
import { useUpload } from '../hooks/useUpload';
import { DocsType, NodeListItemType, URLParams } from '../types/common';
import { NonNullableListItem, Unwrap } from '../types/utils';
import { canCreateFile, canCreateFolder, canUploadFile } from '../utils/ActionsFactory';
import { getUploadAddTypeFromInput } from '../utils/uploadUtils';
import { getNewDocumentActionLabel, inputElement, isFolder } from '../utils/utils';
import { ContextualMenuProps } from './components/ContextualMenu';
import { Displayer } from './components/Displayer';
import { EmptySpaceFiller } from './components/EmptySpaceFiller';
import { List } from './components/List';
import { SortingComponent } from './components/SortingComponent';

const FolderView: React.VFC = () => {
	const { rootId } = useParams<URLParams>();
	const { setActiveNode } = useActiveNode();
	const folderId = useQueryParam('folder');
	const [newFile, setNewFile] = useState<DocsType | undefined>();
	const [t] = useTranslation();
	const { setCreateOptions, removeCreateOptions } = useCreateOptions();
	const [isEmpty, setIsEmpty] = useState(false);

	const { add } = useUpload();

	const currentFolderId = useMemo(() => folderId || rootId || ROOTS.LOCAL_ROOT, [folderId, rootId]);

	const inputElementOnchange = useCallback(
		(ev: Event) => {
			if (ev.currentTarget instanceof HTMLInputElement) {
				if (ev.currentTarget.files) {
					add(
						getUploadAddTypeFromInput(ev.currentTarget.files),
						folderId || rootId || ROOTS.LOCAL_ROOT
					);
				}
				// required to select 2 times the same file/files
				ev.currentTarget.value = '';
			}
		},
		[add, folderId, rootId]
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
		t('folder.create.modal.title', 'Create New folder'),
		t('folder.create.modal.input.label.name', 'Folder Name'),
		createFolderCallback,
		resetNewFolder
	);

	useEffect(() => {
		if (newFolder) {
			openCreateFolderModal(currentFolderId);
		}
	}, [currentFolderId, newFolder, openCreateFolderModal]);

	const createFolderAction = useCallback((event) => {
		event && event.stopPropagation();
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
		t(`docs.create.modal.title.${documentGenericType}`, `Create New ${documentGenericType}`),
		// be careful: the following key is not parsed by i18next-extract, it must be added manually to the en.json file
		/* i18next-extract-disable-next-line */
		t(`docs.create.modal.input.label.name.${documentGenericType}`, `${documentGenericType} Name`),
		createDocsFileAction,
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

	const actions = useMemo<ContextualMenuProps['actions']>(
		() => [
			{
				id: ACTION_IDS.CREATE_FOLDER,
				label: t('create.options.new.folder', 'New Folder'),
				icon: 'FolderOutline',
				onClick: createFolderAction,
				disabled: !isCanCreateFolder
			},
			{
				id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
				label: t('create.options.new.document', 'New Document'),
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
				label: t('create.options.new.spreadsheet', 'New Spreadsheet'),
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
				label: t('create.options.new.presentation', 'New Presentation'),
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
		],
		[createDocsAction, createFolderAction, isCanCreateFile, isCanCreateFolder, t]
	);

	useEffect(() => {
		const createActions = map<
			ContextualMenuProps['actions'][number],
			NonNullable<CreateOptionsContent['createOptions']>[number]
		>(actions, (action) => ({
			type: ACTION_TYPES.NEW,
			id: action.id,
			action: () =>
				({
					// FIXME: remove ts-ignore when shell will fix type of "type"
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					type: ACTION_TYPES.NEW,
					group: FILES_APP_ID,
					...action
				} as Action)
		}));

		setCreateOptions(
			{
				type: ACTION_TYPES.NEW,
				id: ACTION_IDS.UPLOAD_FILE,
				action: () => ({
					// FIXME: remove ts-ignore when shell will fix type of "type"
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					type: ACTION_TYPES.NEW,
					id: ACTION_IDS.UPLOAD_FILE,
					primary: true,
					group: FILES_APP_ID,
					label: t('create.options.new.upload', 'Upload'),
					icon: 'CloudUploadOutline',
					click: (event: React.SyntheticEvent | KeyboardEvent): void => {
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

	const ListComponent = useMemo(
		() => (
			<ListHeaderActionContext.Provider value={<SortingComponent />}>
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
		[actions, currentFolderId, hasMore, isCanUploadFile, loadMore, loading, nodes, t]
	);

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
