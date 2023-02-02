/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useReactiveVar } from '@apollo/client';
import { Action as DSAction, Container, useSnackbar } from '@zextras/carbonio-design-system';
import { PreviewsManagerContext } from '@zextras/carbonio-ui-preview';
import { PreviewManagerContextType } from '@zextras/carbonio-ui-preview/lib/preview/PreviewManager';
import { isEmpty, find, filter, includes, reduce, size, some } from 'lodash';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import ListHeader from '../../../components/ListHeader';
import { useActiveNode } from '../../../hooks/useActiveNode';
import { useNavigation } from '../../../hooks/useNavigation';
import { useSendViaMail } from '../../../hooks/useSendViaMail';
import useUserInfo from '../../../hooks/useUserInfo';
import { draggedItemsVar } from '../../apollo/dragAndDropVar';
import { DISPLAYER_TABS, DRAG_TYPES, PREVIEW_MAX_SIZE, PREVIEW_TYPE, ROOTS } from '../../constants';
import { ListContext, NodeAvatarIconContext } from '../../contexts';
import {
	DeleteNodesType,
	useDeleteNodesMutation
} from '../../hooks/graphql/mutations/useDeleteNodesMutation';
import {
	FlagNodesType,
	useFlagNodesMutation
} from '../../hooks/graphql/mutations/useFlagNodesMutation';
import { useMoveNodesMutation } from '../../hooks/graphql/mutations/useMoveNodesMutation';
import {
	RestoreType,
	useRestoreNodesMutation
} from '../../hooks/graphql/mutations/useRestoreNodesMutation';
import {
	TrashNodesType,
	useTrashNodesMutation
} from '../../hooks/graphql/mutations/useTrashNodesMutation';
import {
	UpdateNodeType,
	useUpdateNodeMutation
} from '../../hooks/graphql/mutations/useUpdateNodeMutation';
import { useGetChildQuery } from '../../hooks/graphql/queries/useGetChildQuery';
import { OpenCopyModal, useCopyModal } from '../../hooks/modals/useCopyModal';
import { useDeletePermanentlyModal } from '../../hooks/modals/useDeletePermanentlyModal';
import { OpenMoveModal, useMoveModal } from '../../hooks/modals/useMoveModal';
import { OpenRenameModal, useRenameModal } from '../../hooks/modals/useRenameModal';
import useSelection from '../../hooks/useSelection';
import { useUpload } from '../../hooks/useUpload';
import { Action, Crumb, NodeListItemType } from '../../types/common';
import { File } from '../../types/graphql/types';
import {
	ActionsFactoryChecker,
	ActionsFactoryCheckerMap,
	buildActionItems,
	canBeMoveDestination,
	getAllPermittedActions
} from '../../utils/ActionsFactory';
import { getUploadAddType } from '../../utils/uploadUtils';
import {
	downloadNode,
	getDocumentPreviewSrc,
	getImgPreviewSrc,
	getPdfPreviewSrc,
	humanFileSize,
	isFile,
	isFolder,
	isSupportedByPreview,
	openNodeWithDocs
} from '../../utils/utils';
import { Dropzone } from './Dropzone';
import { EmptyFolder } from './EmptyFolder';
import { ListContent } from './ListContent';

const MainContainer = styled(Container)`
	border-left: 0.0625rem solid ${(props): string => props.theme.palette.gray6.regular};
`;

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
	fillerWithActions?: JSX.Element;
}

export const List: React.VFC<ListProps> = ({
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
}) => {
	const { navigateToFolder } = useNavigation();
	const { activeNodeId: activeNode, setActiveNode } = useActiveNode();
	const [t] = useTranslation();
	const { data: getChildData } = useGetChildQuery(folderId || '');
	const draggedItems = useReactiveVar(draggedItemsVar);
	const [dropzoneEnabled, setDropzoneEnabled] = useState(false);
	const [dropzoneModal, setDropzoneModal] = useState<{
		title: string;
		message: string;
		icons?: string[];
	}>();

	const folderNode = useMemo(
		() => (getChildData?.getNode && isFolder(getChildData.getNode) && getChildData.getNode) || null,
		[getChildData?.getNode]
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
		() => filter(nodes, (node) => includes(selectedIDs, node.id)),
		[nodes, selectedIDs]
	);

	const { me } = useUserInfo();

	const moveCheckFunction = useCallback<ActionsFactoryChecker>(
		(nodesToMove) => {
			// move for multiple selection is permitted only inside folders because of the workspace concept,
			// which limits the tree where the user can move a node into, considering shares and permissions
			const selectedSize = size(nodesToMove);
			return !!folderId || selectedSize === 1;
		},
		[folderId]
	);

	const actionCheckers = useMemo<ActionsFactoryCheckerMap>(
		() => ({ [Action.Move]: moveCheckFunction }),
		[moveCheckFunction]
	);

	const permittedSelectionModeActions = useMemo(
		() =>
			// TODO: REMOVE CHECK ON ROOT WHEN BE WILL NOT RETURN LOCAL_ROOT AS PARENT FOR SHARED NODES
			getAllPermittedActions(selectedNodes, me, actionCheckers),
		[actionCheckers, me, selectedNodes]
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

	const manageShares = useCallback<(nodeId: string) => void>(
		(nodeId) => {
			setActiveNode(nodeId, DISPLAYER_TABS.sharing);
		},
		[setActiveNode]
	);

	/** Mutation to update the flag status */
	const toggleFlag = useFlagNodesMutation();

	/**
	 * Set flagValue for selected nodes.
	 * @param {boolean} flagValue - value to set
	 */
	const toggleFlagSelection = useCallback<FlagNodesType>(
		(flagValue) =>
			toggleFlag(flagValue, ...selectedNodes).then((result) => {
				exitSelectionMode();
				return result;
			}),
		[toggleFlag, selectedNodes, exitSelectionMode]
	);

	/** Mutation to mark nodes for deletion */
	const markNodesForDeletion = useTrashNodesMutation();

	/** Mutation to restore nodes */
	const restore = useRestoreNodesMutation();

	/** Mutation to delete permanently nodes */
	const deletePermanently = useDeleteNodesMutation();

	const markForDeletionSelection = useCallback<() => ReturnType<TrashNodesType>>(
		() =>
			markNodesForDeletion(...selectedNodes).then((result) => {
				exitSelectionMode();
				return result;
			}),
		[markNodesForDeletion, selectedNodes, exitSelectionMode]
	);

	const restoreSelection = useCallback<() => ReturnType<RestoreType>>(
		() =>
			restore(...selectedNodes).then((result) => {
				exitSelectionMode();
				return result;
			}),
		[restore, selectedNodes, exitSelectionMode]
	);

	const deletePermanentlySelection = useCallback<DeleteNodesType>(
		() => deletePermanently(...selectedNodes),
		[deletePermanently, selectedNodes]
	);

	const openMoveNodesModalAction = useCallback<
		(...nodesToMove: Parameters<OpenMoveModal>[0]) => ReturnType<OpenMoveModal>
	>((...nodesToMove) => openMoveNodesModal(nodesToMove, folderId), [folderId, openMoveNodesModal]);

	const openMoveNodesModalSelection = useCallback<() => ReturnType<OpenMoveModal>>(
		() => openMoveNodesModalAction(...selectedNodes),
		[openMoveNodesModalAction, selectedNodes]
	);

	const openCopyNodesModalAction = useCallback<
		(...nodesToCopy: Parameters<OpenCopyModal>[0]) => ReturnType<OpenCopyModal>
	>((...nodesToCopy) => openCopyNodesModal(nodesToCopy, folderId), [folderId, openCopyNodesModal]);

	const openCopyNodesModalSelection = useCallback<() => ReturnType<OpenCopyModal>>(
		() => openCopyNodesModalAction(...selectedNodes),
		[openCopyNodesModalAction, selectedNodes]
	);

	const [updateNode] = useUpdateNodeMutation();

	const renameNodeAction = useCallback<UpdateNodeType>(
		(nodeId, newName) =>
			updateNode(nodeId, newName).then((result) => {
				if (result.data?.updateNode) {
					setActiveNodeHandler(result.data.updateNode);
				}
				return result;
			}),
		[setActiveNodeHandler, updateNode]
	);

	const { openRenameModal } = useRenameModal(renameNodeAction, exitSelectionMode);

	const openRenameModalAction = useCallback<OpenRenameModal>(
		(node) => openRenameModal(node),
		[openRenameModal]
	);

	const openRenameModalSelection = useCallback<() => ReturnType<OpenRenameModal>>(
		() => openRenameModalAction(selectedNodes[0]),
		[openRenameModalAction, selectedNodes]
	);

	const { openDeletePermanentlyModal } = useDeletePermanentlyModal(
		deletePermanentlySelection,
		exitSelectionMode
	);

	const createSnackbar = useSnackbar();

	const downloadSelection = useCallback(() => {
		const nodeToDownload = find(nodes, (node) => node.id === selectedIDs[0]);
		if (nodeToDownload) {
			// download node without version to be sure last version is downloaded
			downloadNode(nodeToDownload.id);
			exitSelectionMode();
			createSnackbar({
				key: new Date().toLocaleString(),
				type: 'info',
				label: t('snackbar.download.start', 'Your download will start soon'),
				replace: true,
				hideButton: true
			});
		}
	}, [createSnackbar, nodes, selectedIDs, t, exitSelectionMode]);

	const { sendViaMail } = useSendViaMail();

	const sendViaMailCallback = useCallback(() => {
		exitSelectionMode();
		const nodeToSend = find(nodes, (node) => node.id === selectedIDs[0]);
		if (nodeToSend) {
			sendViaMail(nodeToSend.id);
		}
	}, [exitSelectionMode, nodes, selectedIDs, sendViaMail]);

	const manageSharesSelection = useCallback(() => {
		exitSelectionMode();
		const nodeToShare = find(nodes, (node) => node.id === selectedIDs[0]);
		if (nodeToShare) {
			manageShares(nodeToShare.id);
		}
	}, [exitSelectionMode, manageShares, nodes, selectedIDs]);

	const openWithDocsSelection = useCallback(() => {
		const nodeToOpen = find(nodes, (node) => node.id === selectedIDs[0]);
		if (nodeToOpen) {
			openNodeWithDocs(nodeToOpen.id);
			exitSelectionMode();
		}
	}, [nodes, selectedIDs, exitSelectionMode]);

	const { initPreview, emptyPreview, openPreview } = useContext(PreviewsManagerContext);

	const nodesForPreview = useMemo(
		() =>
			reduce(
				nodes,
				(accumulator: Parameters<PreviewManagerContextType['initPreview']>[0], node) => {
					if (isFile(node)) {
						const [$isSupportedByPreview, documentType] = isSupportedByPreview(node.mime_type);
						if ($isSupportedByPreview) {
							const actions = [
								{
									icon: 'ShareOutline',
									id: 'ShareOutline',
									tooltipLabel: t('preview.actions.tooltip.manageShares', 'Manage Shares'),
									onClick: (): void => setActiveNode(node.id, DISPLAYER_TABS.sharing)
								},
								{
									icon: 'DownloadOutline',
									tooltipLabel: t('preview.actions.tooltip.download', 'Download'),
									id: 'DownloadOutline',
									onClick: (): void => downloadNode(node.id)
								}
							];
							const closeAction = {
								id: 'close-action',
								icon: 'ArrowBackOutline',
								tooltipLabel: t('preview.close.tooltip', 'Close')
							};
							if (documentType === PREVIEW_TYPE.IMAGE) {
								accumulator.push({
									previewType: 'image',
									filename: node.name,
									extension: node.extension || undefined,
									size: (node.size !== undefined && humanFileSize(node.size)) || undefined,
									actions,
									closeAction,
									src: node.version ? getImgPreviewSrc(node.id, node.version, 0, 0, 'high') : '',
									id: node.id
								});
								return accumulator;
							}
							// if supported, open document with preview
							const src =
								(node.version &&
									((documentType === PREVIEW_TYPE.PDF && getPdfPreviewSrc(node.id, node.version)) ||
										(documentType === PREVIEW_TYPE.DOCUMENT &&
											getDocumentPreviewSrc(node.id, node.version)))) ||
								'';
							if (includes(permittedSelectionModeActions, Action.OpenWithDocs)) {
								actions.unshift({
									id: 'OpenWithDocs',
									icon: 'BookOpenOutline',
									tooltipLabel: t('actions.openWithDocs', 'Open document'),
									onClick: (): void => openNodeWithDocs(node.id)
								});
							}
							accumulator.push({
								forceCache: false,
								previewType: 'pdf',
								filename: node.name,
								extension: node.extension || undefined,
								size: (node.size !== undefined && humanFileSize(node.size)) || undefined,
								useFallback: node.size !== undefined && node.size > PREVIEW_MAX_SIZE,
								actions,
								closeAction,
								src,
								id: node.id
							});
							return accumulator;
						}
						return accumulator;
					}
					return accumulator;
				},
				[]
			),
		[nodes, permittedSelectionModeActions, setActiveNode, t]
	);

	useEffect(() => {
		initPreview(nodesForPreview);
		return emptyPreview;
	}, [emptyPreview, initPreview, nodesForPreview]);

	const previewSelection = useCallback(() => {
		const nodeToPreview = find(nodes, (node) => node.id === selectedIDs[0]);
		const { id, mime_type: mimeType } = nodeToPreview as File;
		const [$isSupportedByPreview] = isSupportedByPreview(mimeType);
		if ($isSupportedByPreview) {
			openPreview(id);
		} else if (includes(permittedSelectionModeActions, Action.OpenWithDocs)) {
			// if preview is not supported and document can be opened with docs, open editor
			openNodeWithDocs(id);
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
				label: t('actions.manageShares', 'Manage Shares'),
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
				icon: 'EditOutline',
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
				label: t('actions.deletePermanently', 'Delete Permanently'),
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
				add(getUploadAddType(event.dataTransfer), folderId || ROOTS.LOCAL_ROOT);
				if (!folderId) {
					createSnackbar({
						key: new Date().toLocaleString(),
						type: 'info',
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

	const [dragging, isDragged] = useMemo(
		() => [
			!isEmpty(draggedItems),
			!!folderId && !!draggedItems && some(draggedItems, (item) => item.id === folderId)
		],
		[draggedItems, folderId]
	);

	const dropTypes = useMemo(() => {
		const types = [DRAG_TYPES.upload];
		if (!isDragged) {
			types.push(DRAG_TYPES.move);
		}
		return types;
	}, [isDragged]);

	const dropEffect = useMemo(() => {
		if (!isDragged) {
			return dragging ? 'move' : 'copy';
		}
		return 'none';
	}, [dragging, isDragged]);

	const dragMoveHandler = useCallback(() => {
		const draggedNodes = draggedItemsVar();
		const canMove =
			draggedNodes !== null &&
			draggedNodes.length > 0 &&
			folderNode !== null &&
			canBeMoveDestination(folderNode, draggedNodes, me);
		setDropzoneModal(
			canMove
				? {
						title: t('dropzone.move.title.enabled', 'Drag&Drop Mode'),
						message: t(
							'dropzone.move.message.enabled',
							'Drop here your items \n to quickly move them to this folder'
						),
						icons: ['ImageOutline', 'FileAddOutline', 'FilmOutline']
				  }
				: {
						title: t('dropzone.move.title.disabled', 'Drag&Drop Mode'),
						message: t('dropzone.move.message.disabled', 'You cannot drop your items in this area'),
						icons: ['AlertTriangleOutline']
				  }
		);
		return canMove;
	}, [folderNode, me, t]);

	const dragUploadHandler = useCallback(() => {
		setDropzoneModal(
			canUpload
				? {
						title: t('uploads.dropzone.title.enabled', 'Drag&Drop Mode'),
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
						title: t('uploads.dropzone.title.disabled', 'Drag&Drop Mode'),
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

	return (
		<MainContainer
			mainAlignment="flex-start"
			data-testid={`list-${folderId || ''}`}
			maxHeight="100%"
			background="gray6"
		>
			<ListHeader
				folderId={folderId}
				crumbs={crumbs}
				loadingData={loading}
				isSelectionModeActive={isSelectionModeActive}
				isAllSelected={size(selectedIDs) === size(nodes)}
				unSelectAll={unSelectAll}
				selectAll={selectAll}
				exitSelectionMode={exitSelectionMode}
				permittedSelectionModeActionsItems={permittedSelectionModeActionsItems}
			/>
			<Dropzone
				onDrop={dropHandler}
				onDragEnter={dragEnterHandler}
				disabled={isDragged || !dropzoneEnabled}
				effect={dropEffect}
				types={dropTypes}
				title={dropzoneModal?.title}
				message={dropzoneModal?.message}
				icons={dropzoneModal?.icons}
			>
				{(): JSX.Element => (
					<Container background="gray6" mainAlignment="flex-start">
						{nodes.length > 0 && (
							<NodeAvatarIconContext.Provider
								value={{
									tooltipLabel: t('selectionMode.node.tooltip', 'Activate selection mode'),
									tooltipDisabled: false
								}}
							>
								<ListContent
									nodes={nodes}
									selectedMap={selectedMap}
									selectId={selectId}
									isSelectionModeActive={isSelectionModeActive}
									exitSelectionMode={exitSelectionMode}
									toggleFlag={toggleFlag}
									manageShares={manageShares}
									renameNode={openRenameModalAction}
									markNodesForDeletion={markNodesForDeletion}
									restore={restore}
									deletePermanently={deletePermanently}
									moveNodes={openMoveNodesModalAction}
									copyNodes={openCopyNodesModalAction}
									activeNodes={activeNode}
									setActiveNode={setActiveNodeHandler}
									navigateTo={navigateToFolder}
									loading={loading}
									hasMore={hasMore}
									loadMore={loadMore}
									draggable
									customCheckers={actionCheckers}
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
