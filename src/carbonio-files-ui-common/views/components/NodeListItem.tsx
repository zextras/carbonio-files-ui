/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useReactiveVar } from '@apollo/client';
import { Action as DSAction, useSnackbar } from '@zextras/carbonio-design-system';
import { includes, some, debounce, isEmpty } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import { useTheme } from 'styled-components';

import { Dropzone } from './Dropzone';
import { NodeAvatarIcon } from './NodeAvatarIcon';
import { NodeHoverBar } from './NodeHoverBar';
import { NodeListItemUI } from './NodeListItemUI';
import { useActiveNode } from '../../../hooks/useActiveNode';
import { useNavigation } from '../../../hooks/useNavigation';
import { useSendViaMail } from '../../../hooks/useSendViaMail';
import { useUserInfo } from '../../../hooks/useUserInfo';
import { draggedItemsVar } from '../../apollo/dragAndDropVar';
import { selectionModeVar } from '../../apollo/selectionVar';
import {
	DATE_FORMAT_SHORT,
	DISPLAYER_TABS,
	DOUBLE_CLICK_DELAY,
	DRAG_TYPES,
	ROOTS,
	TIMERS
} from '../../constants';
import { useDeleteNodesMutation } from '../../hooks/graphql/mutations/useDeleteNodesMutation';
import { useFlagNodesMutation } from '../../hooks/graphql/mutations/useFlagNodesMutation';
import { useMoveNodesMutation } from '../../hooks/graphql/mutations/useMoveNodesMutation';
import { useRestoreNodesMutation } from '../../hooks/graphql/mutations/useRestoreNodesMutation';
import { useTrashNodesMutation } from '../../hooks/graphql/mutations/useTrashNodesMutation';
import { useCopyModal } from '../../hooks/modals/useCopyModal';
import { useDeletePermanentlyModal } from '../../hooks/modals/useDeletePermanentlyModal';
import { useMoveModal } from '../../hooks/modals/useMoveModal';
import { useRenameModal } from '../../hooks/modals/useRenameModal';
import { useHealthInfo } from '../../hooks/useHealthInfo';
import { usePreview } from '../../hooks/usePreview';
import { useUpload } from '../../hooks/useUpload';
import { Action, NodeListItemType, URLParams } from '../../types/common';
import { NodeType } from '../../types/graphql/types';
import {
	buildActionItems,
	canBeMoveDestination,
	canUploadFile,
	getAllPermittedActions,
	getPermittedHoverBarActions
} from '../../utils/ActionsFactory';
import {
	getPreviewOutputFormat,
	getPreviewThumbnailSrc,
	isPreviewDependantOnDocs,
	isSupportedByPreview
} from '../../utils/previewUtils';
import { getUploadAddType } from '../../utils/uploadUtils';
import {
	downloadNode,
	openNodeWithDocs,
	isFile,
	isSearchView,
	formatDate,
	getIconByFileType,
	getIconColorByFileType,
	isFolder,
	isTrashView
} from '../../utils/utils';

interface NodeListItemProps {
	node: NodeListItemType;
	// Selection props
	isSelected?: boolean;
	isSelectionModeActive?: boolean;
	selectId?: (id: string) => void;
	selectionContextualMenuActionsItems?: DSAction[];
}

export const NodeListItem: React.VFC<NodeListItemProps> = ({
	node,
	// Selection props
	isSelected,
	isSelectionModeActive,
	selectId,
	selectionContextualMenuActionsItems
}) => {
	const { me, locale } = useUserInfo();

	const params = useParams<URLParams>();
	const isATrashFilter = useMemo(() => isTrashView(params), [params]);

	const { navigateToFolder: navigateTo } = useNavigation();

	const draggedItems = useReactiveVar(draggedItemsVar);

	const [dragging, isDragged] = useMemo(
		() => [!isEmpty(draggedItems), !!draggedItems && some(draggedItems, ['id', node.id])],
		[draggedItems, node]
	);

	const {
		id,
		name,
		type,
		updated_at: updatedAt,
		owner,
		flagged: flagActive,
		last_editor: lastEditor,
		disabled: nodeDisabled
	} = node;
	const extension = useMemo(() => (isFile(node) && node.extension) || undefined, [node]);
	const mimeType = useMemo(() => (isFile(node) && node.mime_type) || undefined, [node]);
	const size = useMemo(() => (isFile(node) && node.size) || undefined, [node]);
	const version = useMemo(() => (isFile(node) && node.version) || undefined, [node]);
	const trashed = useMemo(() => node.rootId === ROOTS.TRASH, [node.rootId]);
	const incomingShare = useMemo(() => me !== node.owner?.id, [me, node.owner?.id]);
	const outgoingShare = useMemo(
		() => me === node.owner?.id && node.shares && node.shares.length > 0,
		[me, node.owner?.id, node.shares]
	);
	const disabled = useMemo(() => nodeDisabled ?? isDragged, [nodeDisabled, isDragged]);

	const { add } = useUpload();
	const { moveNodes: moveNodesMutation } = useMoveNodesMutation();
	const { openMoveNodesModal } = useMoveModal();
	const { openCopyNodesModal } = useCopyModal();
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

	const [t] = useTranslation();
	const { openPreview } = usePreview();
	const location = useLocation();
	const [isContextualMenuActive, setIsContextualMenuActive] = useState(false);
	const selectIdCallback = useCallback(
		(event: React.SyntheticEvent) => {
			if (selectId) {
				event.preventDefault();
				selectId(id);
			}
		},
		[id, selectId]
	);

	const theme = useTheme();

	const createSnackbar = useSnackbar();

	const { sendViaMail } = useSendViaMail();

	const sendViaMailCallback = useCallback(() => {
		sendViaMail(id);
	}, [id, sendViaMail]);

	const isNavigable = useMemo(
		() =>
			type === NodeType.Folder || type === NodeType.Root || some(ROOTS, (rootId) => rootId === id),
		[id, type]
	);
	const { canUsePreview, canUseDocs } = useHealthInfo();

	const $isSupportedByPreview = useMemo(
		() =>
			canUsePreview &&
			isSupportedByPreview(mimeType, 'preview')[0] &&
			(!isPreviewDependantOnDocs(mimeType) || canUseDocs),
		[canUseDocs, canUsePreview, mimeType]
	);

	// timer to start navigation
	const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(
		() => (): void => {
			// clear timers on component unmount
			navigationTimerRef.current && clearTimeout(navigationTimerRef.current);
		},
		[]
	);

	const permittedHoverBarActions = useMemo<Action[]>(
		() => node.permissions && getPermittedHoverBarActions(node),
		[node]
	);

	const permittedContextualMenuActions = useMemo(
		() =>
			node.permissions &&
			getAllPermittedActions(
				[node],
				// TODO: REMOVE CHECK ON ROOT WHEN BE WILL NOT RETURN LOCAL_ROOT AS PARENT FOR SHARED NODES
				me,
				canUsePreview,
				canUseDocs
			),
		[canUseDocs, canUsePreview, me, node]
	);

	const openNode = useCallback(() => {
		// remove text selection on double click
		if (window.getSelection) {
			const selection = window.getSelection();
			selection && selection.removeAllRanges();
		}

		if (!isSelectionModeActive && !disabled && !trashed) {
			if (isNavigable) {
				navigateTo(id);
			} else if (includes(permittedContextualMenuActions, Action.Edit)) {
				// if node can be opened with docs on edit mode, open editor
				openNodeWithDocs(id);
			} else if ($isSupportedByPreview) {
				openPreview(id);
			} else if (includes(permittedContextualMenuActions, Action.OpenWithDocs)) {
				// if preview is not supported and document can be opened with docs, open editor
				openNodeWithDocs(id);
			}
		}
	}, [
		isSelectionModeActive,
		disabled,
		trashed,
		isNavigable,
		permittedContextualMenuActions,
		$isSupportedByPreview,
		navigateTo,
		id,
		openPreview
	]);

	const itemsMap = useMemo<Partial<Record<Action, DSAction>>>(
		() => ({
			[Action.Edit]: {
				id: 'Edit',
				icon: 'Edit2Outline',
				label: t('actions.edit', 'Edit'),
				onClick: (): void => {
					openNodeWithDocs(id);
				}
			},
			[Action.Preview]: {
				id: 'Preview',
				icon: 'MaximizeOutline',
				label: t('actions.preview', 'Preview'),
				onClick: (): void => {
					openPreview(id);
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
				label: t('actions.download', 'Download'),
				onClick: (): void => {
					// download node without version to be sure last version is downloaded
					downloadNode(id);
					createSnackbar({
						key: new Date().toLocaleString(),
						type: 'info',
						label: t('snackbar.download.start', 'Your download will start soon'),
						replace: true,
						hideButton: true
					});
				}
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
					openNodeWithDocs(id);
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
			id,
			openPreview,
			createSnackbar,
			setActiveNode,
			node,
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

	const setActiveDebounced = useMemo(
		() =>
			debounce(
				(event: React.SyntheticEvent) => {
					if (!event?.defaultPrevented) {
						setActiveNode(node.id);
					}
				},
				DOUBLE_CLICK_DELAY,
				{ leading: false, trailing: true }
			),
		[node.id, setActiveNode]
	);

	const doubleClickHandler = useCallback(() => {
		setActiveDebounced.cancel();
		openNode();
	}, [openNode, setActiveDebounced]);

	const displayName = useMemo(() => {
		if (lastEditor && lastEditor.id !== owner?.id) {
			return lastEditor.full_name;
		}
		if (owner && owner.id !== me) {
			return owner.full_name;
		}
		return '';
	}, [lastEditor, owner, me]);

	const openContextualMenuHandler = useCallback(() => {
		setIsContextualMenuActive(true);
	}, []);

	const closeContextualMenuHandler = useCallback(() => {
		setIsContextualMenuActive(false);
	}, []);

	const [dropzoneEnabled, setDropzoneEnabled] = useState(isFolder(node));

	const dragMoveHandler = useCallback(() => {
		const draggedNodes = draggedItemsVar();
		if (draggedNodes && draggedNodes.length > 0 && canBeMoveDestination(node, draggedNodes, me)) {
			navigationTimerRef.current = setTimeout(() => {
				navigateTo(node.id);
			}, TIMERS.DRAG_NAVIGATION_TRIGGER);
			return true;
		}
		return false;
	}, [me, navigateTo, node]);

	const dragUploadHandler = useCallback(() => {
		navigationTimerRef.current = setTimeout(() => {
			navigateTo(node.id);
		}, TIMERS.DRAG_NAVIGATION_TRIGGER);
		return canUploadFile(node);
	}, [navigateTo, node]);

	const dragEnterHandler = useCallback(
		(event) => {
			// check if node is a valid destination for write inside action
			setDropzoneEnabled((prevState) => {
				navigationTimerRef.current && clearTimeout(navigationTimerRef.current);
				if (prevState && event.dataTransfer.types.includes(DRAG_TYPES.move)) {
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
	const dragLeaveHandler = useCallback(() => {
		navigationTimerRef.current && clearTimeout(navigationTimerRef.current);
	}, []);

	const moveNodesAction = useCallback(
		(event) => {
			const movingNodes = JSON.parse(event.dataTransfer.getData(DRAG_TYPES.move) || '{}');
			if (movingNodes && isFolder(node)) {
				moveNodesMutation(node, ...movingNodes).then(() => {
					selectionModeVar(false);
				});
			}
		},
		[moveNodesMutation, node]
	);

	const uploadAction = useCallback<React.DragEventHandler>(
		(event) => {
			add(getUploadAddType(event.dataTransfer), node.id);
			createSnackbar({
				key: new Date().toLocaleString(),
				type: 'info',
				label: t('snackbar.upload.success', 'Upload occurred in {{destination}}', {
					destination: t('node.alias.name', node.name, { context: node.id })
				}),
				actionLabel: t('snackbar.upload.goToFolder', 'Go to folder'),
				onActionClick: () => {
					navigateTo(ROOTS.LOCAL_ROOT);
				},
				replace: false,
				hideButton: true
			});
		},
		[add, createSnackbar, navigateTo, node.id, node.name, t]
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

	return (
		<Dropzone
			onDrop={dropHandler}
			onDragEnter={dragEnterHandler}
			onDragLeave={dragLeaveHandler}
			disabled={isDragged || !dropzoneEnabled}
			effect={dropEffect}
			types={dropTypes}
		>
			{(): React.JSX.Element => (
				<NodeListItemUI
					id={id}
					flagActive={flagActive}
					disabled={disabled}
					incomingShare={incomingShare}
					outgoingShare={outgoingShare}
					displayName={displayName}
					name={name}
					trashed={trashed && isSearchView(location)}
					updatedAt={formatDate(updatedAt, locale, DATE_FORMAT_SHORT)}
					extensionOrType={extension ?? t(`node.type.${type.toLowerCase()}`, type)}
					contextualMenuDisabled={
						(disabled || isSelectionModeActive) && selectionContextualMenuActionsItems === undefined
					}
					contextualMenuOnOpen={openContextualMenuHandler}
					contextualMenuOnClose={closeContextualMenuHandler}
					contextualMenuActions={
						selectionContextualMenuActionsItems ?? permittedContextualMenuActionsItems
					}
					listItemContainerOnClick={setActiveDebounced}
					listItemContainerOnDoubleClick={doubleClickHandler}
					hoverContainerBackground={activeNodeId === id ? 'highlight' : 'gray6'}
					listItemContainerContextualMenuActive={isContextualMenuActive}
					listItemContainerDisableHover={isContextualMenuActive || dragging || disabled}
					nodeAvatarIcon={
						<NodeAvatarIcon
							selectionModeActive={isSelectionModeActive}
							selected={isSelected}
							onClick={selectIdCallback}
							compact={false}
							disabled={disabled}
							selectable
							icon={getIconByFileType(type, mimeType ?? id)}
							color={getIconColorByFileType(type, mimeType ?? id, theme)}
							picture={
								canUsePreview
									? getPreviewThumbnailSrc(
											id,
											version,
											type,
											mimeType,
											{ width: 80, height: 80, outputFormat: getPreviewOutputFormat(mimeType) },
											'thumbnail'
										)
									: undefined
							}
						/>
					}
					nodeHoverBar={
						!isSelectionModeActive && !dragging ? (
							<NodeHoverBar actions={permittedHoverBarActionsItems} />
						) : undefined
					}
					size={size}
				/>
			)}
		</Dropzone>
	);
};
