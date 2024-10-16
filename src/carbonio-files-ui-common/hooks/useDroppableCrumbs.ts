/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { DragEventHandler, useCallback, useEffect, useMemo, useRef } from 'react';

import { useApolloClient } from '@apollo/client';
import { BreadcrumbsProps, getColor, useSnackbar } from '@zextras/carbonio-design-system';
import { forEach, isEmpty, map, uniq } from 'lodash';
import { useTranslation } from 'react-i18next';
import { DefaultTheme, useTheme } from 'styled-components';

import { useMoveNodesMutation } from './graphql/mutations/useMoveNodesMutation';
import { useUpload } from './useUpload';
import { useNavigation } from '../../hooks/useNavigation';
import { draggedItemsVar } from '../apollo/dragAndDropVar';
import { selectionModeVar } from '../apollo/selectionVar';
import { DRAG_TYPES, TIMERS } from '../constants';
import { Crumb, DroppableCrumb, Node as FilesNode } from '../types/common';
import { ParentFragmentDoc } from '../types/graphql/types';
import { canBeMoveDestination, canUploadFile } from '../utils/ActionsFactory';
import { getUploadAddType } from '../utils/uploadUtils';
import { hexToRGBA, isFolder } from '../utils/utils';

function setDropzoneActive(color: string, element: HTMLElement, theme: DefaultTheme): void;
function setDropzoneActive(color: '', element: HTMLElement): void;
function setDropzoneActive(color: string, element: HTMLElement, theme?: DefaultTheme): void {
	element.style.backgroundColor = color && theme ? hexToRGBA(getColor(color, theme), 0.4) : '';
}

export function useDroppableCrumbs(
	crumbs: Crumb[] | undefined,
	currentFolderId?: string
): {
	data: DroppableCrumb[];
	collapserProps: NonNullable<BreadcrumbsProps['collapserProps']>;
	dropdownProps: NonNullable<BreadcrumbsProps['dropdownProps']>;
	containerRef: React.RefObject<HTMLDivElement>;
} {
	const [t] = useTranslation();
	const theme = useTheme();
	const openRef = useRef<boolean>(false);
	const collapserRef = useRef<HTMLElement | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const dropdownListRef = useRef<HTMLDivElement>(null);
	const apolloClient = useApolloClient();
	const { moveNodes: moveNodesMutation } = useMoveNodesMutation();
	const { add } = useUpload();
	const createSnackbar = useSnackbar();
	const { navigateToFolder } = useNavigation();
	// timers
	const actionTimer = useRef<NodeJS.Timeout>();
	const closeDropdownTimer = useRef<NodeJS.Timeout>();
	const blurDropdownElementsTimer = useRef<NodeJS.Timeout>();

	useEffect(
		() => (): void => {
			// cleanup timers when hook is unmounted
			actionTimer.current && clearTimeout(actionTimer.current);
			closeDropdownTimer.current && clearTimeout(closeDropdownTimer.current);
			blurDropdownElementsTimer.current && clearTimeout(blurDropdownElementsTimer.current);
		},
		[]
	);

	/**
	 * Close the dropdown if it is open, with a delay to allow user to reach the dropdown list
	 * which is graphically detached from the collapser by design.
	 * If mouse reaches the dropdown list, a dragEnter event is triggered on the dropzone, so in this event the timeout
	 * is cleared. To avoid the delay and perform the close immediately, set delay param to 0
	 */
	const closeDropdown = useCallback<(event: Event | React.SyntheticEvent, delay?: number) => void>(
		(event, delay = TIMERS.DRAG_DELAY_CLOSE_DROPDOWN) => {
			if (openRef.current) {
				event.preventDefault();
				closeDropdownTimer.current && clearTimeout(closeDropdownTimer.current);
				closeDropdownTimer.current = setTimeout(() => {
					containerRef.current?.click();
					openRef.current = false;
				}, delay);
			}
		},
		[]
	);

	const preventDropdownClose = useCallback<DragEventHandler>(() => {
		closeDropdownTimer.current && clearTimeout(closeDropdownTimer.current);
		closeDropdownTimer.current = undefined;
	}, []);

	const getNodeFromCrumb = useCallback(
		(crumb: Crumb) =>
			apolloClient.readFragment({
				fragment: ParentFragmentDoc,
				fragmentName: 'Parent',
				id: apolloClient.cache.identify({
					__typename: 'Folder',
					id: crumb.id
				} satisfies FilesNode<'id'>)
			}),
		[apolloClient]
	);

	const dragMoveHandler = useCallback(
		(crumb: Crumb, event: React.DragEvent<HTMLElement>) => {
			const draggedNodes = draggedItemsVar();
			if (draggedNodes && draggedNodes.length > 0) {
				const parents = uniq(map(draggedNodes, (draggedNode) => draggedNode.parent?.id));
				// if current folder is the parent of all moving nodes, disable the dropzone
				// (current folder/parent cannot trigger navigation nor be destination of the move)
				if (crumb.id !== currentFolderId || parents.length !== 1 || parents[0] !== crumb.id) {
					const node = getNodeFromCrumb(crumb);
					const validDestination = node && canBeMoveDestination(node, draggedNodes);
					setDropzoneActive(validDestination ? 'primary' : 'secondary', event.currentTarget, theme);
					event.dataTransfer.dropEffect = 'move';
					if (validDestination && !actionTimer.current) {
						// if mouse is hovering a child node start the actionTimer to trigger the click action
						actionTimer.current = setTimeout(() => {
							crumb.onClick && crumb.onClick(event);
						}, TIMERS.DRAG_NAVIGATION_TRIGGER);
					}
				} else {
					event.dataTransfer.dropEffect = 'none';
				}
			}
		},
		[currentFolderId, getNodeFromCrumb, theme]
	);

	const dragUploadHandler = useCallback(
		(crumb: Crumb, event: React.DragEvent<HTMLElement>) => {
			const node = getNodeFromCrumb(crumb);
			if (node) {
				if (canUploadFile(node)) {
					setDropzoneActive('primary', event.currentTarget, theme);
				} else {
					setDropzoneActive('secondary', event.currentTarget, theme);
				}
				event.dataTransfer.dropEffect = 'copy';
				if (!actionTimer.current) {
					// trigger action even if the upload is disabled because there could be parent folders with right permissions
					actionTimer.current = setTimeout(() => {
						crumb.onClick && crumb.onClick(event);
					}, TIMERS.DRAG_NAVIGATION_TRIGGER);
				}
			}
		},
		[getNodeFromCrumb, theme]
	);

	const crumbDragEnterHandler = useCallback<(crumb: Crumb) => DragEventHandler<HTMLElement>>(
		(crumb) =>
			(event): void => {
				actionTimer.current && clearTimeout(actionTimer.current);
				actionTimer.current = undefined;
				event.preventDefault();
				event.dataTransfer.effectAllowed = 'copyMove';
				if (event.dataTransfer.types.includes(DRAG_TYPES.move)) {
					dragMoveHandler(crumb, event);
				} else if (event.dataTransfer.types.includes(DRAG_TYPES.upload)) {
					dragUploadHandler(crumb, event);
				}
			},
		[dragMoveHandler, dragUploadHandler]
	);

	const crumbDragOverHandler = useCallback<(crumb: Crumb) => DragEventHandler<HTMLElement>>(
		(crumb) =>
			(event): void => {
				event.preventDefault();
				event.dataTransfer.effectAllowed = 'copyMove';
				if (event.dataTransfer.types.includes(DRAG_TYPES.move)) {
					dragMoveHandler(crumb, event);
				} else if (event.dataTransfer.types.includes(DRAG_TYPES.upload)) {
					dragUploadHandler(crumb, event);
				}
			},
		[dragMoveHandler, dragUploadHandler]
	);

	const crumbDragLeaveHandler = useCallback<DragEventHandler<HTMLElement>>((event) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			// stop the actionTimer when mouse leaves the current target and goes to a parent element
			// if mouse enter a child, related target will be contained by currentTarget
			actionTimer.current && clearTimeout(actionTimer.current);
			actionTimer.current = undefined;
		}
		setDropzoneActive('', event.currentTarget);
	}, []);

	const moveNodesAction = useCallback(
		(
			node: FilesNode<'permissions' | 'id' | 'owner' | 'rootId'>,
			event: React.DragEvent<HTMLElement>
		) => {
			const movingNodes = JSON.parse(event.dataTransfer.getData(DRAG_TYPES.move) || '{}');
			const parents = uniq(map(movingNodes, (draggedNode) => draggedNode.parent?.id));
			if (
				// current folder/parent cannot be destination of the move
				(node.id !== currentFolderId || parents.length !== 1 || parents[0] !== node.id) &&
				isFolder(node) &&
				!isEmpty(movingNodes) &&
				canBeMoveDestination(node, movingNodes)
			) {
				moveNodesMutation(node, ...movingNodes).then(() => {
					selectionModeVar(false);
				});
			}
		},
		[currentFolderId, moveNodesMutation]
	);

	const uploadAction = useCallback(
		(node: FilesNode<'id' | 'name' | 'permissions'>, event: React.DragEvent<HTMLElement>) => {
			if (node && canUploadFile(node)) {
				add(getUploadAddType(event.dataTransfer), node.id);
				createSnackbar({
					key: new Date().toLocaleString(),
					severity: 'info',
					label: t('snackbar.upload.success', 'Upload occurred in {{destination}}', {
						/* i18next-extract-disable-next-line */
						destination: t('node.alias.name', node.name, { context: node.id })
					}),
					actionLabel: t('snackbar.upload.goToFolder', 'Go to folder'),
					onActionClick: () => {
						navigateToFolder(node.id);
					},
					replace: false,
					hideButton: true
				});
			}
		},
		[add, createSnackbar, navigateToFolder, t]
	);

	const crumbDropHandler = useCallback<(crumb: Crumb) => DragEventHandler<HTMLElement>>(
		(crumb) =>
			(event): void => {
				event.preventDefault();
				setDropzoneActive('', event.currentTarget);
				actionTimer.current && clearTimeout(actionTimer.current);
				actionTimer.current = undefined;
				closeDropdown(event, 0);
				const node = getNodeFromCrumb(crumb);
				if (node) {
					if (event.dataTransfer.types.includes(DRAG_TYPES.move)) {
						moveNodesAction(node, event);
					} else if (event.dataTransfer.types.includes(DRAG_TYPES.upload)) {
						uploadAction(node, event);
					}
				}
			},
		[closeDropdown, getNodeFromCrumb, moveNodesAction, uploadAction]
	);

	const collapserDragEnterHandler = useCallback<DragEventHandler<HTMLElement>>(
		(event) => {
			const alreadyOpen = openRef.current;
			setDropzoneActive('secondary', event.currentTarget, theme);
			if (
				!alreadyOpen &&
				(event.currentTarget === event.target || event.currentTarget.contains(event.target as Node))
			) {
				collapserRef.current = event.currentTarget;
				event.currentTarget.click();
				openRef.current = true;
			}
		},
		[theme]
	);

	const collapserDragLeaveHandler = useCallback<DragEventHandler<HTMLElement>>(
		(event) => {
			event.preventDefault();
			setDropzoneActive('', event.currentTarget);
			closeDropdown(event);
		},
		[closeDropdown]
	);

	const collapserDragOverHandler = useCallback<DragEventHandler<HTMLElement>>(
		(event) => {
			event.preventDefault();
			setDropzoneActive('secondary', event.currentTarget, theme);
		},
		[theme]
	);

	const collapserDropHandler = useCallback<DragEventHandler<HTMLElement>>(
		(event) => {
			setDropzoneActive('', event.currentTarget);
			closeDropdown(event, 0);
		},
		[closeDropdown]
	);

	const droppableCrumbs = useMemo(() => {
		if (currentFolderId) {
			return map(crumbs, (crumb) => ({
				...crumb,
				'data-testid': 'drop-crumb',
				onDragEnter: crumbDragEnterHandler(crumb),
				onDragOver: crumbDragOverHandler(crumb),
				onDragLeave: crumbDragLeaveHandler,
				onDrop: crumbDropHandler(crumb)
			}));
		}
		return crumbs || [];
	}, [
		crumbDragEnterHandler,
		crumbDragLeaveHandler,
		crumbDragOverHandler,
		crumbDropHandler,
		crumbs,
		currentFolderId
	]);

	const collapserProps = useMemo<NonNullable<BreadcrumbsProps['collapserProps']>>(
		() => ({
			onDragEnter: collapserDragEnterHandler,
			onDragLeave: collapserDragLeaveHandler,
			onDragOver: collapserDragOverHandler,
			onDrop: collapserDropHandler,
			className: 'breadcrumbCollapser'
		}),
		[
			collapserDragEnterHandler,
			collapserDragLeaveHandler,
			collapserDragOverHandler,
			collapserDropHandler
		]
	);

	const dropdownDragEnterHandler = useCallback<DragEventHandler>(
		(event) => {
			preventDropdownClose(event);
		},
		[preventDropdownClose]
	);

	const dropdownDragLeaveHandler = useCallback<DragEventHandler<HTMLElement>>(
		(event) => {
			if (
				!event.defaultPrevented &&
				!dropdownListRef.current?.contains(event.relatedTarget as Node | null)
			) {
				closeDropdown(event);
			}
		},
		[closeDropdown]
	);

	const dropdownOnCloseHandler = useCallback(() => {
		openRef.current = false;
	}, []);

	const dropdownOnOpenHandler = useCallback(() => {
		if (draggedItemsVar()) {
			// set a timeout to allow dropdown to open
			blurDropdownElementsTimer.current = setTimeout(() => {
				const focused = dropdownListRef.current?.querySelectorAll<HTMLElement>(':focus');
				forEach(focused, (element) => element.blur());
				const dropdownCrumbs =
					dropdownListRef.current?.querySelectorAll<HTMLElement>('.breadcrumbCrumb');
				forEach(dropdownCrumbs, (element) => {
					if (!element.classList.contains('disable-hover')) {
						element.classList.add('disable-hover');
					}
				});
			}, TIMERS.DRAG_PREVENT_HOVER_DROPDOWN);
		}
	}, []);

	const dropdownProps = useMemo<NonNullable<BreadcrumbsProps['dropdownProps']>>(
		() => ({
			onDragEnter: dropdownDragEnterHandler,
			onDragOver: preventDropdownClose,
			onDragLeave: dropdownDragLeaveHandler,
			ref: dropdownRef,
			onClose: dropdownOnCloseHandler,
			onOpen: dropdownOnOpenHandler,
			dropdownListRef
		}),
		[
			dropdownDragEnterHandler,
			dropdownDragLeaveHandler,
			dropdownOnCloseHandler,
			dropdownOnOpenHandler,
			preventDropdownClose
		]
	);

	return {
		data: droppableCrumbs,
		collapserProps,
		dropdownProps,
		containerRef
	};
}
