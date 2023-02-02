/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useContext, useEffect, useMemo } from 'react';

import { useQuery } from '@apollo/client';
import { Button, Container, useSnackbar } from '@zextras/carbonio-design-system';
import { map, filter, includes, size } from 'lodash';
import { useTranslation } from 'react-i18next';

import ListHeader from '../../../components/ListHeader';
import { useActiveNode } from '../../../hooks/useActiveNode';
import { DRAG_TYPES, ROOTS } from '../../constants';
import { ListContext, ListHeaderActionContext } from '../../contexts';
import { usePrevious } from '../../hooks/usePrevious';
import useSelection from '../../hooks/useSelection';
import { useUpload } from '../../hooks/useUpload';
import { useUploadActions } from '../../hooks/useUploadActions';
import { Action } from '../../types/common';
import { UploadItem } from '../../types/graphql/client-types';
import { GetUploadItemsDocument } from '../../types/graphql/types';
import { getUploadAddType, isUploadFolderItem } from '../../utils/uploadUtils';
import { Dropzone } from './Dropzone';
import { EmptyFolder } from './EmptyFolder';
import { ScrollContainer } from './ScrollContainer';
import { UploadListItemWrapper } from './UploadListItemWrapper';

export const UploadList: React.VFC = () => {
	const [t] = useTranslation();

	const { add, removeAllCompleted } = useUpload();
	const { data } = useQuery(GetUploadItemsDocument, {
		variables: { parentId: null }
	});

	const uploadItems = useMemo<UploadItem[]>(() => data?.getUploadItems || [], [data]);

	const uploadStatusSizeIsZero = useMemo(() => uploadItems.length === 0, [uploadItems]);

	const { setActiveNode } = useActiveNode();

	const previousUploadItems = usePrevious<UploadItem[]>(uploadItems);

	useEffect(() => {
		if (
			(previousUploadItems === undefined || size(previousUploadItems) === 0) &&
			size(uploadItems) > 0 &&
			isUploadFolderItem(uploadItems[0])
		) {
			setActiveNode(uploadItems[0].id);
		}
	}, [uploadItems, previousUploadItems, setActiveNode]);

	const { setIsEmpty } = useContext(ListContext);

	useEffect(() => {
		setIsEmpty(uploadStatusSizeIsZero);
	}, [setIsEmpty, uploadStatusSizeIsZero]);

	const crumbs = useMemo(
		() => [
			{
				id: 'uploadCrumbs',
				label: t('secondaryBar.uploads', 'Uploads')
			}
		],
		[t]
	);

	const {
		selectedIDs,
		selectedMap,
		selectId,
		isSelectionModeActive,
		unSelectAll,
		selectAll,
		exitSelectionMode
	} = useSelection(uploadItems);

	const selectedItems = useMemo(
		() => filter(uploadItems, (item) => includes(selectedIDs, item.id)),
		[uploadItems, selectedIDs]
	);

	const items = useMemo(
		() =>
			map(uploadItems, (item) => (
				<UploadListItemWrapper
					key={item.id}
					node={item}
					isSelected={selectedMap && selectedMap[item.id]}
					isSelectionModeActive={isSelectionModeActive}
					selectId={selectId}
				/>
			)),
		[isSelectionModeActive, uploadItems, selectId, selectedMap]
	);

	const actionCallbacks = useMemo<Parameters<typeof useUploadActions>[2]>(
		() => ({
			[Action.RemoveUpload]: exitSelectionMode,
			[Action.RetryUpload]: exitSelectionMode,
			[Action.GoToFolder]: exitSelectionMode
		}),
		[exitSelectionMode]
	);

	const uploadActions = useUploadActions(selectedItems, undefined, actionCallbacks);

	const createSnackbar = useSnackbar();

	const uploadWithDragAndDrop = useCallback<React.DragEventHandler>(
		(event) => {
			add(getUploadAddType(event.dataTransfer), ROOTS.LOCAL_ROOT);
			createSnackbar({
				key: new Date().toLocaleString(),
				type: 'info',
				label: t('uploads.destination.home', "Upload occurred in Files' Home"),
				actionLabel: t('snackbar.upload.goToFolder', 'Go to folder'),
				replace: false,
				hideButton: true
			});
		},
		[add, createSnackbar, t]
	);

	const dropzoneModal = useMemo(
		() => ({
			title: t('uploads.dropzone.title.enabled', 'Drag&Drop Mode'),
			message: t(
				'uploads.dropzone.message.otherView.enabled',
				'Drop here your attachments \n to quick-add them to your Home'
			),
			icons: ['ImageOutline', 'FileAddOutline', 'FilmOutline']
		}),
		[t]
	);

	const headerAction = useMemo(
		() =>
			items.length > 0 && (
				<Button
					type="outlined"
					label={t('uploads.clean.completed', 'Clean completed uploads')}
					icon="CloseOutline"
					onClick={removeAllCompleted}
					shape="round"
					backgroundColor="transparent"
				/>
			),
		[items.length, removeAllCompleted, t]
	);

	return (
		<Container
			mainAlignment="flex-start"
			data-testid={'list-uploads'}
			maxHeight="100%"
			background={'gray6'}
		>
			<ListHeaderActionContext.Provider value={headerAction}>
				<ListHeader
					crumbs={crumbs}
					isSelectionModeActive={isSelectionModeActive}
					unSelectAll={unSelectAll}
					selectAll={selectAll}
					permittedSelectionModeActionsItems={uploadActions}
					exitSelectionMode={exitSelectionMode}
					isAllSelected={size(selectedIDs) === size(items)}
				/>
			</ListHeaderActionContext.Provider>
			<Dropzone
				onDrop={uploadWithDragAndDrop}
				title={dropzoneModal.title}
				message={dropzoneModal.message}
				icons={dropzoneModal.icons}
				effect="copy"
				types={[DRAG_TYPES.upload]}
			>
				{(): JSX.Element =>
					items.length > 0 ? (
						<ScrollContainer>{items}</ScrollContainer>
					) : (
						<EmptyFolder message={t('empty.filter.hint', "It looks like there's nothing here.")} />
					)
				}
			</Dropzone>
		</Container>
	);
};
