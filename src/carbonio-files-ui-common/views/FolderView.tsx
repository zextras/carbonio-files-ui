/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { filter } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Displayer } from './components/Displayer';
import { EmptySpaceFiller } from './components/EmptySpaceFiller';
import { List } from './components/List';
import { SelectionProvider } from './components/SelectionProvider';
import { SortingComponent } from './components/SortingComponent';
import { ViewModeComponent } from './components/ViewModeComponent';
import { ViewLayout } from './ViewLayout';
import { ROOTS } from '../constants';
import { ListHeaderActionContext } from '../contexts';
import { useGetChildrenQuery } from '../hooks/graphql/queries/useGetChildrenQuery';
import { useGetPermissionsQuery } from '../hooks/graphql/queries/useGetPermissionsQuery';
import { useCreateNewActions } from '../hooks/useCreateNewActions';
import useQueryParam from '../hooks/useQueryParam';
import { useUploadFileNewAction } from '../hooks/useUploadFileNewAction';
import { URLParams } from '../types/common';
import { NonNullableListItem, Unwrap } from '../types/utils';
import {
	canCreateFile,
	canCreateFolder,
	canDownload,
	canUploadFile
} from '../utils/ActionsFactory';
import { isFolder, takeIfNotEmpty } from '../utils/utils';
import { DownloadComponent } from './components/DownloadComponent';

const FolderView = (): React.JSX.Element => {
	const { rootId } = useParams<URLParams>();
	const folderId = useQueryParam('folder');
	const [t] = useTranslation();

	const currentFolderId = useMemo(
		() => takeIfNotEmpty(folderId) ?? takeIfNotEmpty(rootId) ?? ROOTS.LOCAL_ROOT,
		[folderId, rootId]
	);

	const { data: currentFolder, loading, hasMore, loadMore } = useGetChildrenQuery(currentFolderId);

	const { data: permissionsData } = useGetPermissionsQuery(currentFolderId);

	const folderName = useMemo(() => currentFolder?.getNode?.name, [currentFolder?.getNode?.name]);

	const showDownloadComponent = useMemo(
		() => currentFolder?.getNode && canDownload({ nodes: [currentFolder?.getNode] }),
		[currentFolder]
	);

	const isUploadFilePermitted = useMemo(
		() => !!permissionsData?.getNode && canUploadFile(permissionsData.getNode),
		[permissionsData]
	);

	const isCreateFolderPermitted = useMemo(
		() => !!permissionsData?.getNode && canCreateFolder(permissionsData.getNode),
		[permissionsData]
	);

	const isCreateFilePermitted = useMemo(
		() => !!permissionsData?.getNode && canCreateFile(permissionsData.getNode),
		[permissionsData]
	);

	useUploadFileNewAction(isUploadFilePermitted, currentFolderId);
	const actions = useCreateNewActions(
		currentFolderId,
		currentFolder,
		isCreateFolderPermitted,
		isCreateFilePermitted
	);

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
				{showDownloadComponent && (
					<DownloadComponent currentFolderId={currentFolderId} folderName={folderName} />
				)}
				<ViewModeComponent />
				<SortingComponent />
			</>
		),
		[currentFolderId, folderName, showDownloadComponent]
	);

	const ListComponent = useMemo(
		() => (
			<ListHeaderActionContext.Provider value={listHeaderActionValue}>
				<SelectionProvider items={nodes}>
					<List
						nodes={nodes}
						folderId={currentFolderId}
						hasMore={hasMore}
						loadMore={loadMore}
						loading={loading}
						canUpload={isUploadFilePermitted}
						fillerWithActions={<EmptySpaceFiller actions={actions} />}
						emptyListMessage={t('empty.folder.hint', "It looks like there's nothing here.")}
						mainList={isUploadFilePermitted}
					/>
				</SelectionProvider>
			</ListHeaderActionContext.Provider>
		),
		[
			actions,
			currentFolderId,
			hasMore,
			isUploadFilePermitted,
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
