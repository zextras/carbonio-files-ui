/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useReactiveVar } from '@apollo/client';
import { Action as DSAction, useSnackbar } from '@zextras/carbonio-design-system';
import { isEmpty, some } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import useUserInfo from '../../../hooks/useUserInfo';
import { draggedItemsVar } from '../../apollo/dragAndDropVar';
import { DRAG_TYPES, ROOTS, TIMERS } from '../../constants';
import { DeleteNodesType } from '../../hooks/graphql/mutations/useDeleteNodesMutation';
import { useMoveNodesMutation } from '../../hooks/graphql/mutations/useMoveNodesMutation';
import { useDeletePermanentlyModal } from '../../hooks/modals/useDeletePermanentlyModal';
import { useUpload } from '../../hooks/useUpload';
import { Action, NodeListItemType, URLParams } from '../../types/common';
import {
	canBeMoveDestination,
	canUploadFile,
	getAllPermittedActions,
	getPermittedHoverBarActions
} from '../../utils/ActionsFactory';
import { getUploadAddType } from '../../utils/uploadUtils';
import { isFile, isFolder, isTrashView } from '../../utils/utils';
import { Dropzone } from './Dropzone';
import { NodeListItem } from './NodeListItem';

interface NodeListItemWrapperProps {
	node: NodeListItemType;
	toggleFlag?: (value: boolean, node: NodeListItemType) => void;
	markNodesForDeletion?: (node: NodeListItemType) => void;
	restore?: (node: NodeListItemType) => void;
	deletePermanently?: DeleteNodesType;
	moveNodes?: (node: NodeListItemType) => void;
	copyNodes?: (node: NodeListItemType) => void;
	manageShares?: (nodeId: string) => void;
	isSelected?: boolean;
	isSelectionModeActive?: boolean;
	selectId?: (id: string) => void;
	exitSelectionMode?: () => void;
	renameNode?: (node: NodeListItemType) => void;
	isActive?: boolean;
	setActive?: (node: NodeListItemType, event: React.SyntheticEvent) => void;
	compact?: boolean;
	navigateTo?: (id: string, event?: React.SyntheticEvent | Event) => void;
	selectionContextualMenuActionsItems?: DSAction[];
}

export const NodeListItemWrapper: React.VFC<NodeListItemWrapperProps> = ({
	node,
	toggleFlag = (): void => undefined,
	markNodesForDeletion = (): void => undefined,
	restore = (): void => undefined,
	deletePermanently = (): ReturnType<DeleteNodesType> =>
		Promise.reject(new Error('deletePermanently not implemented')),
	moveNodes = (): void => undefined,
	copyNodes = (): void => undefined,
	manageShares = (): void => undefined,
	isSelected = false,
	isSelectionModeActive = false,
	selectId = (): void => undefined,
	exitSelectionMode = (): void => undefined,
	renameNode = (): void => undefined,
	isActive = false,
	setActive = (): void => undefined,
	compact = false,
	navigateTo = (): void => undefined,
	selectionContextualMenuActionsItems
}) => {
	const [t] = useTranslation();
	const draggedItems = useReactiveVar(draggedItemsVar);
	const [dropzoneEnabled, setDropzoneEnabled] = useState(isFolder(node));
	const { moveNodes: moveNodesMutation } = useMoveNodesMutation();
	const { add } = useUpload();
	const createSnackbar = useSnackbar();

	// timer to start navigation
	const navigationTimerRef = useRef<NodeJS.Timer | null>(null);

	useEffect(
		() => (): void => {
			// clear timers on component unmount
			navigationTimerRef.current && clearTimeout(navigationTimerRef.current);
		},
		[]
	);

	const [dragging, isDragged] = useMemo(
		() => [!isEmpty(draggedItems), !!draggedItems && some(draggedItems, ['id', node.id])],
		[draggedItems, node]
	);

	const toggleFlagTrue = useCallback(() => {
		toggleFlag(true, node);
	}, [node, toggleFlag]);

	const toggleFlagFalse = useCallback(() => {
		toggleFlag(false, node);
	}, [node, toggleFlag]);

	const markNodesForDeletionCallback = useCallback(() => {
		markNodesForDeletion(node);
	}, [node, markNodesForDeletion]);

	const restoreNodeCallback = useCallback(() => {
		restore(node);
	}, [node, restore]);

	const deletePermanentlyCallback = useCallback(
		() => deletePermanently(node),
		[node, deletePermanently]
	);

	const { openDeletePermanentlyModal } = useDeletePermanentlyModal(deletePermanentlyCallback);

	const moveNodesCallback = useCallback(() => {
		moveNodes(node);
	}, [node, moveNodes]);

	const copyNodesCallback = useCallback(() => {
		copyNodes(node);
	}, [node, copyNodes]);

	const renameNodeCallback = useCallback(() => {
		renameNode(node);
	}, [node, renameNode]);

	const manageSharesCallback = useCallback(() => {
		manageShares(node.id);
	}, [manageShares, node.id]);

	const params = useParams<URLParams>();
	const isATrashFilter = useMemo(() => isTrashView(params), [params]);

	const permittedHoverBarActions = useMemo<Action[]>(
		() => node.permissions && getPermittedHoverBarActions(node),
		[node]
	);

	const { me } = useUserInfo();

	const permittedContextualMenuActions = useMemo(
		() =>
			node.permissions &&
			getAllPermittedActions(
				[node],
				// TODO: REMOVE CHECK ON ROOT WHEN BE WILL NOT RETURN LOCAL_ROOT AS PARENT FOR SHARED NODES
				me
			),
		[me, node]
	);

	const setActiveNode = useCallback(
		(event: React.SyntheticEvent) => {
			setActive(node, event);
		},
		[setActive, node]
	);

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
				type: 'info',
				label: t('snackbar.upload.success', 'Upload occurred in {{destination}}', {
					/* i18next-extract-disable-next-line */
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

	const dropHandler = useCallback(
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
			{(): JSX.Element => (
				<NodeListItem
					key={node.id}
					id={node.id}
					name={node.name}
					type={node.type}
					extension={(isFile(node) && node.extension) || undefined}
					mimeType={(isFile(node) && node.mime_type) || undefined}
					updatedAt={node.updated_at}
					owner={node.owner}
					lastEditor={node.last_editor}
					incomingShare={me !== node.owner?.id}
					outgoingShare={me === node.owner?.id && node.shares && node.shares.length > 0}
					size={isFile(node) ? node.size : undefined}
					flagActive={node.flagged}
					toggleFlagTrue={toggleFlagTrue}
					toggleFlagFalse={toggleFlagFalse}
					markNodesForDeletionCallback={markNodesForDeletionCallback}
					restoreNodeCallback={restoreNodeCallback}
					deletePermanentlyCallback={openDeletePermanentlyModal}
					moveNodesCallback={moveNodesCallback}
					copyNodesCallback={copyNodesCallback}
					manageSharesCallback={manageSharesCallback}
					isSelected={isSelected}
					isSelectionModeActive={isSelectionModeActive}
					selectId={selectId}
					permittedHoverBarActions={permittedHoverBarActions}
					permittedContextualMenuActions={permittedContextualMenuActions}
					renameNode={renameNodeCallback}
					isActive={isActive}
					setActive={setActiveNode}
					compact={compact}
					navigateTo={navigateTo}
					disabled={node.disabled || isDragged}
					selectable={node.selectable}
					trashed={node.rootId === ROOTS.TRASH}
					selectionContextualMenuActionsItems={selectionContextualMenuActionsItems}
					dragging={dragging}
					version={isFile(node) ? node.version : undefined}
				/>
			)}
		</Dropzone>
	);
};
