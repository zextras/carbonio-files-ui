/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { ListV2, type Action as DSAction, Row } from '@zextras/carbonio-design-system';
import { forEach, map, filter, includes } from 'lodash';
import styled from 'styled-components';

import { Draggable } from './Draggable';
import { NodeListItem } from './NodeListItem';
import { NodeListItemDragImage } from './NodeListItemDragImage';
import { useUserInfo } from '../../../hooks/useUserInfo';
import { draggedItemsVar } from '../../apollo/dragAndDropVar';
import { DRAG_TYPES, LIST_ITEM_HEIGHT } from '../../constants';
import { Action, NodeListItemType } from '../../types/common';
import { ActionsFactoryCheckerMap, getPermittedActions } from '../../utils/ActionsFactory';
import { cssCalcBuilder } from '../../utils/utils';

const DragImageContainer = styled.div`
	position: absolute;
	top: -5000px;
	left: -5000px;
	transform: translate(-100%, -100%);
	width: 100%;
`;

interface ListContentProps {
	nodes: NodeListItemType[];
	selectedMap: Record<string, boolean>;
	selectId: (id: string) => void;
	isSelectionModeActive: boolean;
	exitSelectionMode: () => void;
	hasMore?: boolean;
	loadMore?: () => void;
	customCheckers?: ActionsFactoryCheckerMap;
	selectionContextualMenuActionsItems?: DSAction[];
	fillerWithActions?: React.JSX.Element;
}

export const ListContent = ({
	nodes,
	selectedMap,
	selectId,
	isSelectionModeActive,
	exitSelectionMode,
	hasMore = false,
	loadMore = (): void => undefined,
	customCheckers,
	selectionContextualMenuActionsItems,
	fillerWithActions
}: ListContentProps): React.JSX.Element => {
	const dragImageRef = useRef<HTMLDivElement>(null);

	const { me } = useUserInfo();

	const [dragImage, setDragImage] = useState<React.JSX.Element[]>([]);

	const dragStartHandler = useCallback<
		(node: NodeListItemType) => React.DragEventHandler<HTMLElement>
	>(
		(node) =>
			(event): void => {
				forEach(DRAG_TYPES, (dragType) => event.dataTransfer.clearData(dragType));
				const nodesToDrag: NodeListItemType[] = [];
				if (isSelectionModeActive) {
					nodesToDrag.push(...filter(nodes, ({ id }) => !!selectedMap[id]));
				} else {
					nodesToDrag.push(node);
				}
				const draggedItemsTmp: React.JSX.Element[] = [];
				const permittedActions = getPermittedActions(
					nodesToDrag,
					[Action.Move, Action.MoveToTrash],
					me,
					undefined,
					undefined,
					customCheckers
				);
				forEach(nodesToDrag, (nodeToDrag) => {
					draggedItemsTmp.push(
						<NodeListItemDragImage node={nodeToDrag} key={`dragged-${nodeToDrag.id}`} />
					);
				});
				setDragImage(draggedItemsTmp);
				dragImageRef.current && event.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
				draggedItemsVar(nodesToDrag);
				if (includes(permittedActions, Action.Move)) {
					event.dataTransfer.setData(DRAG_TYPES.move, JSON.stringify(nodesToDrag));
				}
				if (includes(permittedActions, Action.MoveToTrash)) {
					event.dataTransfer.setData(DRAG_TYPES.markForDeletion, JSON.stringify(nodesToDrag));
				}
			},
		[customCheckers, isSelectionModeActive, me, nodes, selectedMap]
	);

	const dragEndHandler = useCallback(() => {
		setDragImage([]);
		draggedItemsVar(null);
	}, []);

	const intersectionObserverInitOptions = useMemo(() => ({ threshold: 0.5 }), []);

	const items = useMemo(() => {
		const nodeElements = map(nodes, (node) => (
			<Draggable
				onDragStart={dragStartHandler(node)}
				onDragEnd={dragEndHandler}
				key={node.id}
				effect="move"
			>
				<NodeListItem
					node={node}
					isSelected={selectedMap && selectedMap[node.id]}
					isSelectionModeActive={isSelectionModeActive}
					selectId={selectId}
					exitSelectionMode={exitSelectionMode}
					selectionContextualMenuActionsItems={
						selectedMap && selectedMap[node.id] ? selectionContextualMenuActionsItems : undefined
					}
				/>
			</Draggable>
		));

		if (fillerWithActions && !hasMore) {
			nodeElements.push(
				React.cloneElement(fillerWithActions, {
					key: 'fillerWithActions',
					children: <Row height={cssCalcBuilder(LIST_ITEM_HEIGHT, ['/', 2])} />
				})
			);
		}

		return nodeElements;
	}, [
		nodes,
		fillerWithActions,
		hasMore,
		dragStartHandler,
		dragEndHandler,
		selectedMap,
		isSelectionModeActive,
		selectId,
		exitSelectionMode,
		selectionContextualMenuActionsItems
	]);

	return (
		<>
			<ListV2
				maxHeight={'100%'}
				height={'auto'}
				data-testid="main-list"
				background={'gray6'}
				onListBottom={hasMore ? loadMore : undefined}
				intersectionObserverInitOptions={intersectionObserverInitOptions}
			>
				{items}
			</ListV2>
			<DragImageContainer ref={dragImageRef}>{dragImage}</DragImageContainer>
		</>
	);
};
