/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useQuery, useReactiveVar } from '@apollo/client';
import { Action as DSAction, Container, useSnackbar } from '@zextras/carbonio-design-system';
import { PreviewsManagerContext } from '@zextras/carbonio-ui-preview';
import { HeaderAction } from '@zextras/carbonio-ui-preview/lib/preview/Header';
import { PreviewManagerContextType } from '@zextras/carbonio-ui-preview/lib/preview/PreviewManager';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { Dropzone } from './Dropzone';
import { EmptyFolder } from './EmptyFolder';
import { ListContent } from './ListContent';
import ListHeader from '../../../components/ListHeader';
import { useActiveNode } from '../../../hooks/useActiveNode';
import { useNavigation } from '../../../hooks/useNavigation';
import { useSendViaMail } from '../../../hooks/useSendViaMail';
import { draggedItemsVar } from '../../apollo/dragAndDropVar';
import {
	DISPLAYER_TABS,
	DOWNLOAD_PATH,
	DRAG_TYPES,
	PREVIEW_MAX_SIZE,
	PREVIEW_TYPE,
	REST_ENDPOINT,
	ROOTS
} from '../../constants';
import { ListContext, NodeAvatarIconContext } from '../../contexts';
import {
	DeleteNodesType,
	useDeleteNodesMutation
} from '../../hooks/graphql/mutations/useDeleteNodesMutation';
import { useFlagNodesMutation } from '../../hooks/graphql/mutations/useFlagNodesMutation';
import { useMoveNodesMutation } from '../../hooks/graphql/mutations/useMoveNodesMutation';
import { useRestoreNodesMutation } from '../../hooks/graphql/mutations/useRestoreNodesMutation';
import { useTrashNodesMutation } from '../../hooks/graphql/mutations/useTrashNodesMutation';
import { OpenCopyModal, useCopyModal } from '../../hooks/modals/useCopyModal';
import { useDeletePermanentlyModal } from '../../hooks/modals/useDeletePermanentlyModal';
import { OpenMoveModal, useMoveModal } from '../../hooks/modals/useMoveModal';
import { OpenRenameModal, useRenameModal } from '../../hooks/modals/useRenameModal';
import { useHealthInfo } from '../../hooks/useHealthInfo';
import useSelection from '../../hooks/useSelection';
import { useUpload } from '../../hooks/useUpload';
import { Action, Crumb, NodeListItemType } from '../../types/common';
import { File, Folder, GetChildrenParentDocument, NodeType } from '../../types/graphql/types';
import {
	buildActionItems,
	canBeMoveDestination,
	canEdit,
	canOpenWithDocs,
	getAllPermittedActions
} from '../../utils/ActionsFactory';
import { getPreviewSrc, isSupportedByPreview } from '../../utils/previewUtils';
import { getUploadAddType } from '../../utils/uploadUtils';
import { downloadNode, humanFileSize, isFile, isFolder, openNodeWithDocs } from '../../utils/utils';

const MainContainer = styled(Container)`
	border-left: 0.0625rem solid ${(props): string => props.theme.palette.gray6.regular};
`;

function getHeaderActions(
	t: TFunction,
	setActiveNode: ReturnType<typeof useActiveNode>['setActiveNode'],
	node: File,
	canUseDocs: boolean
): Array<HeaderAction> {
	const actions: Array<HeaderAction> = [
		{
			icon: 'ShareOutline',
			id: 'ShareOutline',
			tooltipLabel: t('preview.actions.tooltip.manageShares', 'Manage shares'),
			onClick: (): void => setActiveNode(node.id, DISPLAYER_TABS.sharing)
		},
		{
			icon: 'DownloadOutline',
			tooltipLabel: t('preview.actions.tooltip.download', 'Download'),
			id: 'DownloadOutline',
			onClick: (): void => downloadNode(node.id)
		}
	];
	if (canEdit({ nodes: [node], canUseDocs })) {
		actions.unshift({
			icon: 'Edit2Outline',
			id: 'Edit',
			onClick: (): void => openNodeWithDocs(node.id),
			tooltipLabel: t('preview.actions.tooltip.edit', 'Edit')
		});
	} else if (canOpenWithDocs({ nodes: [node], canUseDocs })) {
		actions.unshift({
			id: 'OpenWithDocs',
			icon: 'BookOpenOutline',
			tooltipLabel: t('actions.openWithDocs', 'Open document'),
			onClick: (): void => openNodeWithDocs(node.id)
		});
	}
	return actions;
}

interface ListProps {
	nodes: NodeListItemType[];
	loading?: boolean;
	hasMore?: boolean;
	loadMore?: () => void;
	folderId?: string;
	crumbs?: Crumb[];
	mainList: boolean;
	emptyListMessage: string;
	canUpload?: boolean;
	fillerWithActions?: React.JSX.Element;
}

export const List = ({
	nodes,
	loading,
	hasMore,
	loadMore,
	folderId,
	crumbs,
	mainList = false,
	emptyListMessage,
	canUpload = true,
	fillerWithActions
}: ListProps): React.JSX.Element => {
	const { navigateToFolder } = useNavigation();
	const { setActiveNode } = useActiveNode();
	const [t] = useTranslation();
	const { data: getChildrenParentData, loading: getChildrenParentLoading } = useQuery(
		GetChildrenParentDocument,
		{
			variables: {
				node_id: folderId ?? ''
			},
			skip: !folderId,
			fetchPolicy: 'cache-only'
		}
	);
	const draggedItems = useReactiveVar(draggedItemsVar);
	const [dropzoneEnabled, setDropzoneEnabled] = useState(false);
	const [dropzoneModal, setDropzoneModal] = useState<{
		title: string;
		message: string;
		icons?: string[];
	}>();

	const folderNode = useMemo<Pick<Folder, '__typename' | 'id' | 'owner' | 'permissions'> | null>(
		() =>
			getChildrenParentData?.getNode &&
			getChildrenParentData?.getNode.id === folderId &&
			isFolder(getChildrenParentData.getNode)
				? getChildrenParentData.getNode
				: null,
		[getChildrenParentData?.getNode, folderId]
	);

	const { setIsEmpty } = useContext(ListContext);

	useEffect(() => {
		// assuming that using the product means there are some contents and most of the lists
		// have at least one node inside, consider loading as "has nodes" to reduce
		// the effects related to list empty - loading - not empty state changes
		setIsEmpty(!loading && nodes.length === 0);
	}, [loading, nodes.length, setIsEmpty]);

	const {
		selectedIDs,
		selectedMap,
		selectId,
		isSelectionModeActive,
		unSelectAll,
		selectAll,
		exitSelectionMode
	} = useSelection(nodes);

	const { openMoveNodesModal } = useMoveModal(exitSelectionMode);

	const { openCopyNodesModal } = useCopyModal(exitSelectionMode);

	const selectedNodes = useMemo(
		() => nodes.filter((node) => selectedIDs.includes(node.id)),
		[nodes, selectedIDs]
	);

	const { canUsePreview, canUseDocs } = useHealthInfo();

	const permittedSelectionModeActions = useMemo(
		() => getAllPermittedActions(selectedNodes, canUsePreview, canUseDocs),
		[canUseDocs, canUsePreview, selectedNodes]
	);

	const setActiveNodeHandler = useCallback<
		(node: Pick<NodeListItemType, 'id'>, event?: React.SyntheticEvent) => void
	>(
		(node, event) => {
			if (!event?.defaultPrevented) {
				setActiveNode(node.id);
			}
		},
		[setActiveNode]
	);

	// mutation hooks:
	/** Mutation to update the flag status */
	const toggleFlag = useFlagNodesMutation();
	/** Mutation to mark nodes for deletion */
	const markNodesForDeletion = useTrashNodesMutation();
	/** Mutation to restore nodes */
	const restore = useRestoreNodesMutation();
	/** Mutation to delete permanently nodes */
	const deletePermanently = useDeleteNodesMutation();
	/**
	 * Set flagValue for selected nodes.
	 * @param {boolean} flagValue - value to set
	 */
	const toggleFlagSelection = useCallback(
		(flagValue: boolean) => {
			toggleFlag(flagValue, ...selectedNodes).then((result) => {
				exitSelectionMode();
				return result;
			});
		},
		[toggleFlag, selectedNodes, exitSelectionMode]
	);

	const markForDeletionSelection = useCallback<() => void>(() => {
		markNodesForDeletion(...selectedNodes).then((result) => {
			exitSelectionMode();
			return result;
		});
	}, [markNodesForDeletion, selectedNodes, exitSelectionMode]);

	const restoreSelection = useCallback<() => void>(() => {
		restore(...selectedNodes).then((result) => {
			exitSelectionMode();
			return result;
		});
	}, [restore, selectedNodes, exitSelectionMode]);

	const deletePermanentlySelection = useCallback<DeleteNodesType>(
		() => deletePermanently(...selectedNodes),
		[deletePermanently, selectedNodes]
	);

	const openMoveNodesModalSelection = useCallback<() => ReturnType<OpenMoveModal>>(
		() => openMoveNodesModal(selectedNodes, folderId),
		[folderId, openMoveNodesModal, selectedNodes]
	);

	const openCopyNodesModalSelection = useCallback<() => ReturnType<OpenCopyModal>>(
		() => openCopyNodesModal(selectedNodes, folderId),
		[folderId, openCopyNodesModal, selectedNodes]
	);

	const renameActionCallback = useCallback(
		(nodeId: string) => {
			exitSelectionMode();
			setActiveNodeHandler({ id: nodeId });
		},
		[exitSelectionMode, setActiveNodeHandler]
	);

	const { openRenameModal } = useRenameModal(renameActionCallback);

	const openRenameModalSelection = useCallback<() => ReturnType<OpenRenameModal>>(
		() => openRenameModal(selectedNodes[0]),
		[openRenameModal, selectedNodes]
	);

	const { openDeletePermanentlyModal } = useDeletePermanentlyModal(
		deletePermanentlySelection,
		exitSelectionMode
	);

	const createSnackbar = useSnackbar();

	const downloadSelection = useCallback(() => {
		const nodeToDownload = nodes.find((node) => node.id === selectedIDs[0]);
		if (nodeToDownload) {
			// download node without version to be sure last version is downloaded
			downloadNode(nodeToDownload.id);
			exitSelectionMode();
			createSnackbar({
				key: new Date().toLocaleString(),
				severity: 'info',
				label: t('snackbar.download.start', 'Your download will start soon'),
				replace: true,
				hideButton: true
			});
		}
	}, [createSnackbar, nodes, selectedIDs, t, exitSelectionMode]);

	const { sendViaMail } = useSendViaMail();

	const sendViaMailCallback = useCallback(() => {
		exitSelectionMode();
		const nodeToSend = nodes.find((node) => node.id === selectedIDs[0]);
		if (nodeToSend) {
			sendViaMail(nodeToSend.id);
		}
	}, [exitSelectionMode, nodes, selectedIDs, sendViaMail]);

	const manageSharesSelection = useCallback(() => {
		exitSelectionMode();
		const nodeToShare = nodes.find((node) => node.id === selectedIDs[0]);
		if (nodeToShare) {
			setActiveNode(nodeToShare.id, DISPLAYER_TABS.sharing);
		}
	}, [exitSelectionMode, nodes, selectedIDs, setActiveNode]);

	const openWithDocsSelection = useCallback(() => {
		const nodeToOpen = nodes.find((node) => node.id === selectedIDs[0]);
		if (nodeToOpen) {
			openNodeWithDocs(nodeToOpen.id);
			exitSelectionMode();
		}
	}, [nodes, selectedIDs, exitSelectionMode]);

	const { initPreview, emptyPreview, openPreview } = useContext(PreviewsManagerContext);

	const nodesForPreview = useMemo(
		() =>
			nodes.reduce<Parameters<PreviewManagerContextType['initPreview']>[0]>((accumulator, node) => {
				if (!isFile(node)) {
					return accumulator;
				}
				const item = {
					filename: node.name,
					extension: node.extension ?? undefined,
					size: (node.size !== undefined && humanFileSize(node.size, t)) || undefined,
					actions: getHeaderActions(t, setActiveNode, node, canUseDocs),
					closeAction: {
						id: 'close-action',
						icon: 'ArrowBackOutline',
						tooltipLabel: t('preview.close.tooltip', 'Close')
					},
					id: node.id
				};

				if (node.type === NodeType.Video) {
					const url = `${REST_ENDPOINT}${DOWNLOAD_PATH}/${encodeURIComponent(node.id)}${
						node.version ? `/${node.version}` : ''
					}`;
					accumulator.push({
						...item,
						mimeType: node.mime_type,
						src: url,
						previewType: 'video',
						errorLabel: t(
							'preview.video.errorLabel',
							'This video cannot be played. Try to reproduce it using another browser'
						)
					});
					return accumulator;
				}
				const [$isSupportedByPreview, documentType] = isSupportedByPreview(
					node.mime_type,
					'preview'
				);
				if (!$isSupportedByPreview) {
					return accumulator;
				}

				if (documentType === PREVIEW_TYPE.IMAGE) {
					accumulator.push({
						...item,
						src: getPreviewSrc(node, documentType),
						previewType: 'image'
					});
				} else {
					accumulator.push({
						...item,
						src: getPreviewSrc(node, documentType),
						forceCache: false,
						previewType: 'pdf',
						useFallback: node.size !== undefined && node.size > PREVIEW_MAX_SIZE
					});
				}
				return accumulator;
			}, []),
		[canUseDocs, nodes, setActiveNode, t]
	);

	useEffect(() => {
		initPreview(nodesForPreview);
		return emptyPreview;
	}, [emptyPreview, initPreview, nodesForPreview]);

	const previewSelection = useCallback(() => {
		const nodeToPreview = nodes.find((node) => node.id === selectedIDs[0]);
		if (nodeToPreview) {
			if (permittedSelectionModeActions.includes(Action.Preview)) {
				openPreview(nodeToPreview.id);
			} else if (permittedSelectionModeActions.includes(Action.OpenWithDocs)) {
				// if preview is not supported and document can be opened with docs, open editor
				openNodeWithDocs(nodeToPreview.id);
			}
		}
	}, [nodes, permittedSelectionModeActions, selectedIDs, openPreview]);

	const itemsMap = useMemo<Partial<Record<Action, DSAction>>>(
		() => ({
			[Action.Edit]: {
				id: 'Edit',
				icon: 'Edit2Outline',
				label: t('actions.edit', 'Edit'),
				onClick: openWithDocsSelection
			},
			[Action.Preview]: {
				id: 'Preview',
				icon: 'MaximizeOutline',
				label: t('actions.preview', 'Preview'),
				onClick: previewSelection
			},
			[Action.SendViaMail]: {
				id: 'SendViaMail',
				icon: 'EmailOutline',
				label: t('actions.sendViaMail', 'Send via mail'),
				onClick: sendViaMailCallback
			},
			[Action.Download]: {
				id: 'Download',
				icon: 'Download',
				label: t('actions.download', 'Download'),
				onClick: downloadSelection
			},
			[Action.ManageShares]: {
				id: 'ManageShares',
				icon: 'ShareOutline',
				label: t('actions.manageShares', 'Manage shares'),
				onClick: manageSharesSelection
			},
			[Action.Flag]: {
				id: 'Flag',
				icon: 'FlagOutline',
				label: t('actions.flag', 'Flag'),
				onClick: (): void => {
					toggleFlagSelection(true);
				}
			},
			[Action.UnFlag]: {
				id: 'UnFlag',
				icon: 'UnflagOutline',
				label: t('actions.unflag', 'Unflag'),
				onClick: (): void => {
					toggleFlagSelection(false);
				}
			},
			[Action.OpenWithDocs]: {
				id: 'OpenWithDocs',
				icon: 'BookOpenOutline',
				label: t('actions.openWithDocs', 'Open document'),
				onClick: openWithDocsSelection
			},
			[Action.Copy]: {
				id: 'Copy',
				icon: 'Copy',
				label: t('actions.copy', 'Copy'),
				onClick: openCopyNodesModalSelection
			},
			[Action.Move]: {
				id: 'Move',
				icon: 'MoveOutline',
				label: t('actions.move', 'Move'),
				onClick: openMoveNodesModalSelection
			},
			[Action.Rename]: {
				id: 'Rename',
				icon: 'Edit2Outline',
				label: t('actions.rename', 'Rename'),
				onClick: openRenameModalSelection
			},
			[Action.MoveToTrash]: {
				id: 'MarkForDeletion',
				icon: 'Trash2Outline',
				label: t('actions.moveToTrash', 'Move to Trash'),
				onClick: markForDeletionSelection
			},
			[Action.Restore]: {
				id: 'Restore',
				icon: 'RestoreOutline',
				label: t('actions.restore', 'Restore'),
				onClick: restoreSelection
			},
			[Action.DeletePermanently]: {
				id: 'DeletePermanently',
				icon: 'DeletePermanentlyOutline',
				label: t('actions.deletePermanently', 'Delete permanently'),
				onClick: openDeletePermanentlyModal
			}
		}),
		[
			downloadSelection,
			manageSharesSelection,
			markForDeletionSelection,
			openCopyNodesModalSelection,
			openDeletePermanentlyModal,
			openMoveNodesModalSelection,
			openRenameModalSelection,
			openWithDocsSelection,
			previewSelection,
			restoreSelection,
			sendViaMailCallback,
			t,
			toggleFlagSelection
		]
	);

	const permittedSelectionModeActionsItems = useMemo<DSAction[]>(
		() => buildActionItems(itemsMap, permittedSelectionModeActions),
		[itemsMap, permittedSelectionModeActions]
	);

	const { add } = useUpload();

	const uploadWithDragAndDrop = useCallback<React.DragEventHandler>(
		(event) => {
			if (canUpload) {
				add(getUploadAddType(event.dataTransfer), folderId ?? ROOTS.LOCAL_ROOT);
				if (!folderId) {
					createSnackbar({
						key: new Date().toLocaleString(),
						severity: 'info',
						label: t('uploads.destination.home', "Upload occurred in Files' Home"),
						actionLabel: t('snackbar.upload.goToFolder', 'Go to folder'),
						onActionClick: () => {
							navigateToFolder(ROOTS.LOCAL_ROOT);
						},
						replace: true,
						hideButton: true
					});
				}
			}
		},
		[add, canUpload, createSnackbar, folderId, navigateToFolder, t]
	);

	const { moveNodes: moveNodesMutation } = useMoveNodesMutation();

	const moveNodesAction = useCallback<React.DragEventHandler>(
		(event) => {
			const movingNodes = JSON.parse(event.dataTransfer.getData(DRAG_TYPES.move) || '{}');
			if (movingNodes && folderNode) {
				moveNodesMutation(folderNode, ...movingNodes).then(() => {
					exitSelectionMode();
				});
			}
		},
		[exitSelectionMode, folderNode, moveNodesMutation]
	);

	const [isDraggingNodes, isCurrentFolderDragged] = useMemo<[boolean, boolean]>(
		() => [
			!!draggedItems && draggedItems.length > 0,
			!!folderId && !!draggedItems?.some((item) => item.id === folderId)
		],
		[draggedItems, folderId]
	);

	const dropTypes = useMemo(() => {
		const types = [DRAG_TYPES.upload];
		if (!isCurrentFolderDragged) {
			types.push(DRAG_TYPES.move);
		}
		return types;
	}, [isCurrentFolderDragged]);

	const dropEffect = useMemo(() => {
		if (!isCurrentFolderDragged) {
			return isDraggingNodes ? 'move' : 'copy';
		}
		return 'none';
	}, [isDraggingNodes, isCurrentFolderDragged]);

	const dragMoveHandler = useCallback(() => {
		const draggedNodes = draggedItemsVar();
		const canMove =
			draggedNodes !== null &&
			draggedNodes.length > 0 &&
			folderNode !== null &&
			canBeMoveDestination(folderNode, draggedNodes);
		setDropzoneModal(
			canMove
				? {
						title: t('dropzone.move.title.enabled', 'Drag&Drop mode.'),
						message: t(
							'dropzone.move.message.enabled',
							'Drop here your items \n to quickly move them to this folder.'
						),
						icons: ['ImageOutline', 'FileAddOutline', 'FilmOutline']
					}
				: {
						title: t('dropzone.move.title.disabled', 'Drag&Drop mode.'),
						message: t(
							'dropzone.move.message.disabled',
							'You cannot drop your items in this area.'
						),
						icons: ['AlertTriangleOutline']
					}
		);
		return canMove;
	}, [folderNode, t]);

	const dragUploadHandler = useCallback(() => {
		setDropzoneModal(
			canUpload
				? {
						title: t('uploads.dropzone.title.enabled', 'Drag&Drop mode.'),
						message:
							(folderId &&
								t(
									'uploads.dropzone.message.folderView.enabled',
									'Drop here your attachments \n to quick-add them to this folder'
								)) ||
							t(
								'uploads.dropzone.message.otherView.enabled',
								'Drop here your attachments \n to quick-add them to your Home'
							),
						icons: ['ImageOutline', 'FileAddOutline', 'FilmOutline']
					}
				: {
						title: t('uploads.dropzone.title.disabled', 'Drag&Drop mode.'),
						message: t(
							'uploads.dropzone.message.disabled',
							'You cannot drop an attachment in this area'
						),
						icons: ['AlertTriangleOutline']
					}
		);
		return canUpload;
	}, [canUpload, folderId, t]);

	const dragEnterHandler = useCallback<React.DragEventHandler>(
		(event) => {
			// check if node is a valid destination for write inside action
			setDropzoneEnabled(() => {
				if (event.dataTransfer.types.includes(DRAG_TYPES.move)) {
					return dragMoveHandler();
				}
				if (event.dataTransfer.types.includes(DRAG_TYPES.upload)) {
					return dragUploadHandler();
				}
				return false;
			});
		},
		[dragMoveHandler, dragUploadHandler]
	);

	const dropHandler = useCallback<React.DragEventHandler>(
		(event) => {
			if (dropzoneEnabled) {
				if (event.dataTransfer.types.includes(DRAG_TYPES.move)) {
					moveNodesAction(event);
				} else if (event.dataTransfer.types.includes(DRAG_TYPES.upload)) {
					uploadWithDragAndDrop(event);
				}
			}
		},
		[dropzoneEnabled, moveNodesAction, uploadWithDragAndDrop]
	);

	const nodeAvatarIconContextValue = useMemo<React.ContextType<typeof NodeAvatarIconContext>>(
		() => ({
			tooltipLabel: t('selectionMode.node.tooltip', 'Activate selection mode'),
			tooltipDisabled: false
		}),
		[t]
	);

	return (
		<MainContainer
			mainAlignment="flex-start"
			data-testid={`list-${folderId ?? ''}`}
			maxHeight="100%"
			background={'gray6'}
		>
			<ListHeader
				selectedCount={selectedNodes.length}
				folderId={folderId}
				crumbs={crumbs}
				loadingData={loading || getChildrenParentLoading}
				isSelectionModeActive={isSelectionModeActive}
				isAllSelected={selectedIDs.length === nodes.length}
				unSelectAll={unSelectAll}
				selectAll={selectAll}
				exitSelectionMode={exitSelectionMode}
				permittedSelectionModeActionsItems={permittedSelectionModeActionsItems}
			/>
			<Dropzone
				onDrop={dropHandler}
				onDragEnter={dragEnterHandler}
				disabled={isCurrentFolderDragged || !dropzoneEnabled}
				effect={dropEffect}
				types={dropTypes}
				title={dropzoneModal?.title}
				message={dropzoneModal?.message}
				icons={dropzoneModal?.icons}
			>
				{(): React.JSX.Element => (
					<Container background={'gray6'} mainAlignment="flex-start">
						{nodes.length > 0 && (
							<NodeAvatarIconContext.Provider value={nodeAvatarIconContextValue}>
								<ListContent
									nodes={nodes}
									selectedMap={selectedMap}
									selectId={selectId}
									isSelectionModeActive={isSelectionModeActive}
									exitSelectionMode={exitSelectionMode}
									hasMore={hasMore}
									loadMore={loadMore}
									selectionContextualMenuActionsItems={permittedSelectionModeActionsItems}
									fillerWithActions={fillerWithActions}
								/>
								{fillerWithActions &&
									React.cloneElement(fillerWithActions, {
										children: <Container height="fill" data-testid="fillerContainer" />
									})}
							</NodeAvatarIconContext.Provider>
						)}
						{nodes.length === 0 && !loading && !fillerWithActions && (
							<EmptyFolder mainList={mainList} message={emptyListMessage} />
						)}
						{nodes.length === 0 &&
							!loading &&
							fillerWithActions &&
							React.cloneElement(fillerWithActions, {
								children: <EmptyFolder mainList={mainList} message={emptyListMessage} />
							})}
					</Container>
				)}
			</Dropzone>
		</MainContainer>
	);
};
