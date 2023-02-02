/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
	AccordionItem,
	AccordionItemType,
	getColor,
	IconButton,
	Padding,
	Row,
	Tooltip
} from '@zextras/carbonio-design-system';
import { map, uniq, find, noop, every } from 'lodash';
import styled from 'styled-components';

import useUserInfo from '../../../hooks/useUserInfo';
import { draggedItemsVar } from '../../apollo/dragAndDropVar';
import { selectionModeVar } from '../../apollo/selectionVar';
import { DRAG_TYPES, ROOTS, TIMERS } from '../../constants';
import { useMoveNodesMutation } from '../../hooks/graphql/mutations/useMoveNodesMutation';
import { useTrashNodesMutation } from '../../hooks/graphql/mutations/useTrashNodesMutation';
import { useGetBaseNodeQuery } from '../../hooks/graphql/queries/useGetBaseNodeQuery';
import { useGetRootsListQuery } from '../../hooks/graphql/queries/useGetRootsListQuery';
import { useUpload } from '../../hooks/useUpload';
import { PickIdNodeType } from '../../types/common';
import { Folder, Node } from '../../types/graphql/types';
import { DeepPick } from '../../types/utils';
import { canBeWriteNodeDestination, canUploadFile } from '../../utils/ActionsFactory';
import { getUploadAddType } from '../../utils/uploadUtils';
import { isFile, isFolder } from '../../utils/utils';
import { Dropzone } from './Dropzone';

// TODO: replace with updated DS Accordion once available
const CustomAccordionItem = styled(AccordionItem)<{ $dragging: boolean }>`
	flex-basis: auto !important;
	background-color: ${({ theme, $dragging }): string =>
		$dragging ? getColor('gray5', theme) : 'inherit'};
	height: 2.5rem;
`;

interface SecondaryBarItemProps {
	item: AccordionItemType;
	expanded: boolean;
}

export const SecondaryBarItem: React.VFC<SecondaryBarItemProps> = ({ item, expanded }) => {
	const { add } = useUpload();
	const accordionItemRef = useRef<HTMLDivElement>(null);
	const { data } = useGetRootsListQuery();
	const [rootId, setRootId] = useState<string>();
	const [dropEnabled, setDropEnabled] = useState(false);
	const [dropAction, setDropAction] = useState<typeof DataTransfer.prototype.dropEffect>('none');
	const { data: getBaseNodeData } = useGetBaseNodeQuery(rootId);
	const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(
		() => (): void => {
			// clear timers on component unmount
			navigationTimerRef.current && clearTimeout(navigationTimerRef.current);
		},
		[]
	);

	const isRoot = useMemo(
		() => find(data?.getRootsList, (root) => root?.id === item.id) !== undefined,
		[data, item]
	);

	useEffect(() => {
		if (isRoot && item.id !== ROOTS.TRASH) {
			setRootId(item.id);
		}
	}, [isRoot, item]);

	const { moveNodes: moveNodesMutation } = useMoveNodesMutation();
	const markNodesForDeletionMutation = useTrashNodesMutation();

	const dropHandler = useCallback<React.DragEventHandler>(
		(event) => {
			const isUploadingFiles = event.dataTransfer.files.length > 0;
			const movingNodes = event.dataTransfer.getData(DRAG_TYPES.move);
			const markingForDeletion = event.dataTransfer.getData(DRAG_TYPES.markForDeletion);
			navigationTimerRef.current && clearTimeout(navigationTimerRef.current);
			if (item.id.includes(ROOTS.TRASH) && markingForDeletion) {
				const nodesToMarkForDeletion: Array<PickIdNodeType & DeepPick<Node, 'owner', 'id'>> =
					JSON.parse(markingForDeletion);
				markNodesForDeletionMutation(...nodesToMarkForDeletion).then(() => {
					selectionModeVar(false);
				});
			} else if (getBaseNodeData?.getNode) {
				if (isUploadingFiles) {
					add(getUploadAddType(event.dataTransfer), item.id);
				} else if (movingNodes) {
					const nodesToMove: Array<Partial<Node> & PickIdNodeType> = JSON.parse(movingNodes);
					moveNodesMutation(getBaseNodeData.getNode as Folder, ...nodesToMove).then(() => {
						selectionModeVar(false);
					});
				}
			}
		},
		[add, getBaseNodeData, item, markNodesForDeletionMutation, moveNodesMutation]
	);

	const { me } = useUserInfo();

	const dragEnterHandler = useCallback<React.DragEventHandler>(
		(event) => {
			const isUploadingFiles = event.dataTransfer.types.includes(DRAG_TYPES.upload);
			const isMovingNode = event.dataTransfer.types.includes(DRAG_TYPES.move);
			const isMarkingForDeletion = event.dataTransfer.types.includes(DRAG_TYPES.markForDeletion);
			const draggedNodes = draggedItemsVar();
			const owners = uniq(map(draggedNodes, (node) => node.owner?.id));
			const allOwnedNodes = owners.length === 1 && owners[0] === me;
			const allSharedNodes = owners.length > 0 && !find(owners, (owner) => owner === me);
			navigationTimerRef.current && clearTimeout(navigationTimerRef.current);
			if (item.id.includes(ROOTS.TRASH) && isMarkingForDeletion) {
				const allTrashed = every(draggedNodes, (node) => node.rootId === ROOTS.TRASH);
				setDropAction('move');
				setDropEnabled(
					!allTrashed &&
						(item.id === ROOTS.TRASH ||
							(item.id === ROOTS.TRASH_MY_ELEMENTS && allOwnedNodes) ||
							(item.id === ROOTS.TRASH_SHARED_ELEMENTS && allSharedNodes))
				);
			} else if (getBaseNodeData?.getNode) {
				if (isUploadingFiles) {
					setDropAction('copy');
					const dropEnabledForUpload = canUploadFile(getBaseNodeData.getNode as Folder);
					setDropEnabled(dropEnabledForUpload);
					if (dropEnabledForUpload) {
						// for the secondary bar allow navigation only for roots with permission to upload
						navigationTimerRef.current = setTimeout(() => {
							item.onClick && item.onClick(event);
						}, TIMERS.DRAG_NAVIGATION_TRIGGER);
					}
				} else if (isMovingNode) {
					setDropAction('move');
					const movingFile = find(draggedNodes, (node) => isFile(node)) !== undefined;
					const movingFolder = find(draggedNodes, (node) => isFolder(node)) !== undefined;
					const parents = uniq(map(draggedNodes, (node) => node.parent?.id));
					// shared node cannot be moved in roots
					const dropEnabledForMove =
						(movingFile || movingFolder) &&
						allOwnedNodes &&
						(parents.length !== 1 || parents[0] !== getBaseNodeData.getNode.id) &&
						canBeWriteNodeDestination(getBaseNodeData.getNode as Folder, movingFile, movingFolder);
					setDropEnabled(dropEnabledForMove);
					if (dropEnabledForMove) {
						navigationTimerRef.current = setTimeout(() => {
							item.onClick && item.onClick(event);
						}, TIMERS.DRAG_NAVIGATION_TRIGGER);
					}
				}
			} else {
				setDropAction('none');
				setDropEnabled(false);
			}
		},
		[getBaseNodeData, item, me]
	);

	const dragLeaveHandler = useCallback(() => {
		navigationTimerRef.current && clearTimeout(navigationTimerRef.current);
	}, []);

	return (
		<Dropzone
			onDrop={dropHandler}
			onDragEnter={dragEnterHandler}
			onDragLeave={dragLeaveHandler}
			disabled={!dropEnabled}
			effect={dropAction}
			types={[DRAG_TYPES.upload, DRAG_TYPES.move, DRAG_TYPES.markForDeletion]}
		>
			{(dragging): JSX.Element =>
				expanded ? (
					<CustomAccordionItem item={item} ref={accordionItemRef} $dragging={dragging} />
				) : (
					<Row mainAlignment="flex-start" takeAvailableSpace>
						<Tooltip label={item.label} placement="right">
							<Padding all="extrasmall">
								<IconButton
									customSize={{ iconSize: 'large', paddingSize: 'small' }}
									icon={item.icon || ''}
									onClick={item.onClick || noop}
									backgroundColor={(item.active && 'highlight') || undefined}
									iconColor={item.iconCustomColor || item.iconColor}
								/>
							</Padding>
						</Tooltip>
					</Row>
				)
			}
		</Dropzone>
	);
};

export const SecondaryBarItemExpanded: React.VFC<{
	item: AccordionItemType;
}> = ({ item }) => <SecondaryBarItem item={item} expanded />;

export const SecondaryBarItemNotExpanded: React.VFC<{
	item: AccordionItemType;
}> = ({ item }) => <SecondaryBarItem item={item} expanded={false} />;
