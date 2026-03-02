/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useReactiveVar } from '@apollo/client';
import { Action as DSAction, useSnackbar, useTheme } from '@zextras/carbonio-design-system';
import { includes, some } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';

import { Dropzone } from './Dropzone';
import { NodeAvatarIcon } from './NodeAvatarIcon';
import { NodeGridItemUI } from './NodeGridItemUI';
import { NodeHoverBar } from './NodeHoverBar';
import { NodeListItemUI } from './NodeListItemUI';
import { useSelectionContext } from './SelectionProvider';
import { useActiveNode } from '../../../hooks/useActiveNode';
import { useIsCarbonioCE } from '../../../hooks/useIsCarbonioCE';
import { useNavigation } from '../../../hooks/useNavigation';
import { useSendViaMail } from '../../../hooks/useSendViaMail';
import { useUserInfo } from '../../../hooks/useUserInfo';
import { draggedItemsVar } from '../../apollo/dragAndDropVar';
import {
	DATE_FORMAT_SHORT,
	DISPLAYER_TABS,
	DRAG_TYPES,
	ROOTS,
	TIMERS,
	VIEW_MODE
} from '../../constants';
import { ListContext } from '../../contexts';
import { useDeleteNodesMutation } from '../../hooks/graphql/mutations/useDeleteNodesMutation';
import { useFlagNodesMutation } from '../../hooks/graphql/mutations/useFlagNodesMutation';
import { useMoveNodesMutation } from '../../hooks/graphql/mutations/useMoveNodesMutation';
import { useRestoreNodesMutation } from '../../hooks/graphql/mutations/useRestoreNodesMutation';
import { useTrashNodesMutation } from '../../hooks/graphql/mutations/useTrashNodesMutation';
import { useCopyModal } from '../../hooks/modals/useCopyModal';
import { useDeletePermanentlyModal } from '../../hooks/modals/useDeletePermanentlyModal';
import { useMoveModal } from '../../hooks/modals/useMoveModal';
import { useRenameModal } from '../../hooks/modals/useRenameModal';
import { useTransferOwnershipModal } from '../../hooks/modals/useTransferOwnershipModal';
import { useDownloadNodes } from '../../hooks/useDownloadNodes';
import { useHealthInfo } from '../../hooks/useHealthInfo';
import { useOpenWithDocs } from '../../hooks/useOpenWithDocs';
import { usePreview } from '../../hooks/usePreview';
import { useUpload } from '../../hooks/useUpload';
import { Node, URLParams } from '../../types/common';
import { Maybe, NodeType, Share } from '../../types/graphql/types';
import { DeepPick } from '../../types/utils';
import {
	Action,
	buildActionItems,
	canBeMoveDestination,
	canUploadFile,
	getAllPermittedActions,
	getPermittedHoverBarActions
} from '../../utils/ActionsFactory';
import { getPreviewOutputFormat, getPreviewThumbnailSrc } from '../../utils/previewUtils';
import { getUploadAddType } from '../../utils/uploadUtils';
import {
	isFile,
	isSearchView,
	formatDate,
	getIconByFileType,
	getIconColorByFileType,
	isFolder,
	isTrashView,
	nodeToNodeListItemUIProps
} from '../../utils/utils';

type NodeItem = Node<
	| 'id'
	| 'name'
	| 'flagged'
	| 'owner'
	| 'last_editor'
	| 'type'
	| 'rootId'
	| 'permissions'
	| 'updated_at',
	'size' | 'extension' | 'mime_type' | 'version'
> &
	DeepPick<Node<'parent'>, 'parent', 'id' | 'permissions' | '__typename'> & {
		shares: Maybe<Pick<Share, '__typename'>>[];
	};

export interface NodeListItemProps {
	node: NodeItem;
	selectionContextualMenuActionsItems?: DSAction[];
}

export const NodeListItem = ({
	node,
	selectionContextualMenuActionsItems
}: NodeListItemProps): React.JSX.Element => {
	const { selectId, isSelectionModeActive, exitSelectionMode, selectedMap } = useSelectionContext();
	const { viewMode } = useContext(ListContext);
	const { locale } = useUserInfo();

	const { downloadNodeByType } = useDownloadNodes();

	const params = useParams<URLParams>();
	const isATrashFilter = useMemo(() => isTrashView(params), [params]);

	const { navigateToFolder } = useNavigation();

	const draggedItems = useReactiveVar(draggedItemsVar);

	const [dragging, isDragged] = useMemo(
		() => [
			!!draggedItems && draggedItems.length > 0,
			!!draggedItems?.some((item) => item.id === node.id)
		],
		[draggedItems, node]
	);
	const [t] = useTranslation();
	const theme = useTheme();

	const props = nodeToNodeListItemUIProps(node, t);

	const mimeType = useMemo(() => (isFile(node) && node.mime_type) || undefined, [node]);
	const size = useMemo(() => (isFile(node) && node.size) || undefined, [node]);
	const trashed = useMemo(() => node.rootId === ROOTS.TRASH, [node.rootId]);
	const icon = useMemo(
		() => getIconByFileType(node.type, mimeType ?? node.id),
		[mimeType, node.id, node.type]
	);
	const color = useMemo(
		() => getIconColorByFileType(node.type, mimeType ?? node.id, theme),
		[mimeType, node.id, node.type, theme]
	);

	const { add } = useUpload();
	const { moveNodes: moveNodesMutation } = useMoveNodesMutation();
	const { openMoveNodesModal } = useMoveModal();
	const { openCopyNodesModal } = useCopyModal();
	const { openTransferOwnershipModal } = useTransferOwnershipModal();
	const { openRenameModal } = useRenameModal();
	const { setActiveNode, activeNodeId } = useActiveNode();
	const toggleFlag = useFlagNodesMutation();
	const markNodesForDeletion = useTrashNodesMutation();
	const restore = useRestoreNodesMutation();
	const deletePermanently = useDeleteNodesMutation();
	const deletePermanentlyCallback = useCallback(
		() => deletePermanently(node),
		[node, deletePermanently]
	);
	const { openDeletePermanentlyModal } = useDeletePermanentlyModal(deletePermanentlyCallback);

	const { openPreview } = usePreview();
	const location = useLocation();
	const [isContextualMenuActive, setIsContextualMenuActive] = useState(false);
	const selectIdCallback = useCallback(
		(event: React.SyntheticEvent) => {
			if (selectId) {
				event.preventDefault();
				selectId(node.id);
			}
		},
		[node.id, selectId]
	);

	const createSnackbar = useSnackbar();

	const { sendViaMail } = useSendViaMail();

	const sendViaMailCallback = useCallback(() => {
		sendViaMail(node);
	}, [node, sendViaMail]);

	const isNavigable = useMemo(
		() =>
			node.type === NodeType.Folder ||
			node.type === NodeType.Root ||
			some(ROOTS, (rootId) => rootId === node.id),
		[node.id, node.type]
	);
	const { canUsePreview, canUseDocs } = useHealthInfo();
	const isCarbonioCE = useIsCarbonioCE();
	const openNodeWithDocs = useOpenWithDocs();

	// timer to start navigation
	const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(
		() => (): void => {
			// clear timers on component unmount
			navigationTimerRef.current && clearTimeout(navigationTimerRef.current);
		},
		[]
	);

	const permittedHoverBarActions = useMemo(() => getPermittedHoverBarActions(node), [node]);

	const permittedContextualMenuActions = useMemo(
		() =>
			node.permissions &&
			getAllPermittedActions({
				nodes: [node],
				canUsePreview,
				canUseDocs,
				isCarbonioCE
			}),
		[canUseDocs, canUsePreview, node, isCarbonioCE]
	);

	const openNode = useCallback(() => {
		// remove text selection on double click
		if (window.getSelection) {
			const selection = window.getSelection();
			selection?.removeAllRanges();
		}

		if (!isSelectionModeActive && !isDragged && !trashed) {
			if (isNavigable) {
				navigateToFolder(node.id);
			} else if (includes(permittedContextualMenuActions, Action.Edit)) {
				// if node can be opened with docs on edit mode, open editor
				openNodeWithDocs(node.id);
			} else if (includes(permittedContextualMenuActions, Action.Preview)) {
				openPreview(node.id);
			} else if (includes(permittedContextualMenuActions, Action.OpenWithDocs)) {
				// if preview is not supported and document can be opened with docs, open editor
				openNodeWithDocs(node.id);
			}
		}
	}, [
		isSelectionModeActive,
		isDragged,
		trashed,
		isNavigable,
		permittedContextualMenuActions,
		navigateToFolder,
		node.id,
		openNodeWithDocs,
		openPreview
	]);

	const itemsMap = useMemo<Partial<Record<Action, DSAction>>>(
		() => ({
			[Action.TransferOwnership]: {
				id: 'TransferOwnership',
				icon: 'SwapOutline',
				label: t('actions.transferOwnership', 'Transfer ownership'),
				onClick: (): void => {
					openTransferOwnershipModal([node]);
				}
			},
			[Action.Edit]: {
				id: 'Edit',
				icon: 'Edit2Outline',
				label: t('actions.edit', 'Edit'),
				onClick: (): void => {
					openNodeWithDocs(node.id);
				}
			},
			[Action.Preview]: {
				id: 'Preview',
				icon: 'MaximizeOutline',
				label: t('actions.preview', 'Preview'),
				onClick: (): void => {
					openPreview(node.id);
				}
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
				label: t('actions.downloadNode', 'Download'),
				onClick: (): void => downloadNodeByType(node)
			},
			[Action.ManageShares]: {
				id: 'ManageShares',
				icon: 'ShareOutline',
				label: t('actions.manageShares', 'Manage shares'),
				onClick: (): void => {
					setActiveNode(node.id, DISPLAYER_TABS.sharing);
				}
			},
			[Action.Flag]: {
				id: 'Flag',
				icon: 'FlagOutline',
				label: t('actions.flag', 'Flag'),
				onClick: (): void => {
					toggleFlag(true, node);
				}
			},
			[Action.UnFlag]: {
				id: 'Unflag',
				icon: 'UnflagOutline',
				label: t('actions.unflag', 'Unflag'),
				onClick: (): void => {
					toggleFlag(false, node);
				}
			},
			[Action.OpenWithDocs]: {
				id: 'OpenWithDocs',
				icon: 'BookOpenOutline',
				label: t('actions.openWithDocs', 'Open document'),
				onClick: (): void => {
					openNodeWithDocs(node.id);
				}
			},
			[Action.Copy]: {
				id: 'Copy',
				icon: 'Copy',
				label: t('actions.copy', 'Copy'),
				onClick: (): void => {
					openCopyNodesModal([node], node.parent?.id);
				}
			},
			[Action.Move]: {
				id: 'Move',
				icon: 'MoveOutline',
				label: t('actions.move', 'Move'),
				onClick: (): void => {
					openMoveNodesModal([node], node.parent?.id);
				}
			},
			[Action.Rename]: {
				id: 'Rename',
				icon: 'Edit2Outline',
				label: t('actions.rename', 'Rename'),
				onClick: (): void => {
					openRenameModal(node);
				}
			},
			[Action.MoveToTrash]: {
				id: 'MarkForDeletion',
				icon: 'Trash2Outline',
				label: t('actions.moveToTrash', 'Move to Trash'),
				onClick: (): void => {
					markNodesForDeletion(node);
				}
			},
			[Action.Restore]: {
				id: 'Restore',
				icon: 'RestoreOutline',
				label: t('actions.restore', 'Restore'),
				onClick: (): void => {
					restore(node);
				}
			},
			[Action.DeletePermanently]: {
				id: 'DeletePermanently',
				icon: 'DeletePermanentlyOutline',
				label: t('actions.deletePermanently', 'Delete permanently'),
				onClick: (): void => {
					openDeletePermanentlyModal();
				}
			}
		}),
		[
			t,
			sendViaMailCallback,
			openTransferOwnershipModal,
			node,
			openNodeWithDocs,
			openPreview,
			downloadNodeByType,
			setActiveNode,
			toggleFlag,
			openCopyNodesModal,
			openMoveNodesModal,
			openRenameModal,
			markNodesForDeletion,
			restore,
			openDeletePermanentlyModal
		]
	);

	const permittedHoverBarActionsItems = useMemo(
		() => buildActionItems(itemsMap, permittedHoverBarActions),
		[itemsMap, permittedHoverBarActions]
	);

	const permittedContextualMenuActionsItems = useMemo(
		() => buildActionItems(itemsMap, permittedContextualMenuActions),
		[itemsMap, permittedContextualMenuActions]
	);

	const setActive = useCallback(
		(event: React.SyntheticEvent) => {
			if (!event?.defaultPrevented) {
				setActiveNode(node.id);
			}
		},
		[node.id, setActiveNode]
	);

	const doubleClickHandler = useCallback(() => {
		openNode();
	}, [openNode]);

	const openContextualMenuHandler = useCallback(() => {
		setIsContextualMenuActive(true);
	}, []);

	const closeContextualMenuHandler = useCallback(() => {
		setIsContextualMenuActive(false);
	}, []);

	const [dropzoneEnabled, setDropzoneEnabled] = useState(isFolder(node));

	const dragMoveHandler = useCallback(() => {
		const draggedNodes = draggedItemsVar();
		if (draggedNodes && draggedNodes.length > 0 && canBeMoveDestination(node, draggedNodes)) {
			navigationTimerRef.current = setTimeout(() => {
				navigateToFolder(node.id);
			}, TIMERS.DRAG_NAVIGATION_TRIGGER);
			return true;
		}
		return false;
	}, [navigateToFolder, node]);

	const dragUploadHandler = useCallback(() => {
		navigationTimerRef.current = setTimeout(() => {
			navigateToFolder(node.id);
		}, TIMERS.DRAG_NAVIGATION_TRIGGER);
		return canUploadFile(node);
	}, [navigateToFolder, node]);

	const dragEnterHandler = useCallback<React.DragEventHandler>(
		(event) => {
			// deep copy dataTransfer types to avoid dataTransfer types being modified
			const types = [...event.dataTransfer.types];

			// check if node is a valid destination for write inside action
			setDropzoneEnabled((prevState) => {
				navigationTimerRef.current && clearTimeout(navigationTimerRef.current);
				if (prevState && types.includes(DRAG_TYPES.move)) {
					return dragMoveHandler();
				}
				if (types.includes(DRAG_TYPES.upload)) {
					return dragUploadHandler();
				}
				return false;
			});
		},
		[dragMoveHandler, dragUploadHandler]
	);
	const dragLeaveHandler = useCallback(() => {
		navigationTimerRef.current && clearTimeout(navigationTimerRef.current);
	}, []);

	const moveNodesAction = useCallback(
		(event: React.DragEvent) => {
			const movingNodes = JSON.parse(event.dataTransfer.getData(DRAG_TYPES.move) || '{}');
			if (movingNodes && isFolder(node)) {
				moveNodesMutation(node, ...movingNodes).then(() => {
					exitSelectionMode();
				});
			}
		},
		[exitSelectionMode, moveNodesMutation, node]
	);

	const uploadAction = useCallback<React.DragEventHandler>(
		(event) => {
			add(getUploadAddType(event.dataTransfer), node.id);
			createSnackbar({
				key: new Date().toLocaleString(),
				severity: 'info',
				label: t('snackbar.upload.success', 'Upload occurred in {{destination}}', {
					destination: t('node.alias.name', node.name, { context: node.id })
				}),
				actionLabel: t('snackbar.upload.goToFolder', 'Go to folder'),
				onActionClick: () => {
					navigateToFolder(ROOTS.LOCAL_ROOT);
				},
				replace: false,
				hideButton: true
			});
		},
		[add, createSnackbar, navigateToFolder, node.id, node.name, t]
	);
	const dropHandler = useCallback<React.DragEventHandler>(
		(event) => {
			navigationTimerRef.current && clearTimeout(navigationTimerRef.current);
			if (dropzoneEnabled) {
				if (event.dataTransfer.types.includes(DRAG_TYPES.move)) {
					moveNodesAction(event);
				} else if (event.dataTransfer.types.includes(DRAG_TYPES.upload)) {
					uploadAction(event);
				}
			}
		},
		[dropzoneEnabled, moveNodesAction, uploadAction]
	);

	const dropTypes = useMemo(() => {
		const types = [];
		if (!isDragged) {
			types.push(DRAG_TYPES.move);
			if (isFolder(node) && !isATrashFilter) {
				// upload is handled only for folder items and
				types.push(DRAG_TYPES.upload);
			}
		}
		return types;
	}, [isATrashFilter, isDragged, node]);

	const dropEffect = useMemo(() => {
		if (!isDragged) {
			return dragging ? 'move' : 'copy';
		}
		return 'none';
	}, [dragging, isDragged]);

	const createImgSrc = useCallback(
		(args: { width: number; height: number }) =>
			canUsePreview
				? getPreviewThumbnailSrc(
						node.id,
						mimeType,
						{ ...args, outputFormat: getPreviewOutputFormat(mimeType) },
						'thumbnail'
					)
				: undefined,
		[canUsePreview, mimeType, node.id]
	);

	return (
		<Dropzone
			onDrop={dropHandler}
			onDragEnter={dragEnterHandler}
			onDragLeave={dragLeaveHandler}
			disabled={isDragged || !dropzoneEnabled}
			effect={dropEffect}
			types={dropTypes}
		>
			{(): React.JSX.Element =>
				viewMode === VIEW_MODE.grid ? (
					<NodeGridItemUI
						{...props}
						icon={icon}
						color={color}
						showPreview={isFile(node)}
						disabled={isDragged}
						trashed={trashed && isSearchView(location)}
						updatedAt={formatDate(node.updated_at, locale, DATE_FORMAT_SHORT)}
						contextualMenuDisabled={
							(isDragged || isSelectionModeActive) &&
							selectionContextualMenuActionsItems === undefined
						}
						contextualMenuOnOpen={openContextualMenuHandler}
						contextualMenuOnClose={closeContextualMenuHandler}
						contextualMenuActions={
							selectionContextualMenuActionsItems || permittedContextualMenuActionsItems
						}
						hoverContainerBackground={activeNodeId === node.id ? 'highlight' : 'gray6'}
						listItemContainerContextualMenuActive={isContextualMenuActive}
						listItemContainerOnClick={setActive}
						listItemContainerOnDoubleClick={doubleClickHandler}
						listItemContainerDisableHover={isContextualMenuActive || dragging}
						createImgSrc={createImgSrc}
						nodeAvatarIcon={
							<NodeAvatarIcon
								selectionModeActive={isSelectionModeActive}
								selected={selectedMap?.[node.id]}
								onClick={selectIdCallback}
								compact={false}
								disabled={isDragged}
								selectable
								icon={icon}
								color={color}
							/>
						}
					/>
				) : (
					<NodeListItemUI
						{...props}
						disabled={isDragged}
						trashed={trashed && isSearchView(location)}
						updatedAt={formatDate(node.updated_at, locale, DATE_FORMAT_SHORT)}
						contextualMenuDisabled={
							(isDragged || isSelectionModeActive) &&
							selectionContextualMenuActionsItems === undefined
						}
						contextualMenuOnOpen={openContextualMenuHandler}
						contextualMenuOnClose={closeContextualMenuHandler}
						contextualMenuActions={
							selectionContextualMenuActionsItems ?? permittedContextualMenuActionsItems
						}
						listItemContainerOnClick={setActive}
						listItemContainerOnDoubleClick={doubleClickHandler}
						hoverContainerBackground={activeNodeId === node.id ? 'highlight' : 'gray6'}
						listItemContainerContextualMenuActive={isContextualMenuActive}
						listItemContainerDisableHover={isContextualMenuActive || dragging}
						nodeAvatarIcon={
							<NodeAvatarIcon
								selectionModeActive={isSelectionModeActive}
								selected={selectedMap?.[node.id]}
								onClick={selectIdCallback}
								compact={false}
								disabled={isDragged}
								selectable
								icon={icon}
								color={color}
								picture={createImgSrc({ width: 80, height: 80 })}
							/>
						}
						nodeHoverBar={
							!isSelectionModeActive && !dragging ? (
								<NodeHoverBar actions={permittedHoverBarActionsItems} />
							) : undefined
						}
						size={size}
					/>
				)
			}
		</Dropzone>
	);
};
