/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';

import { ListV2, type Action as DSAction, Row } from '@zextras/carbonio-design-system';
import { forEach, filter, includes } from 'lodash';
import styled, { css } from 'styled-components';

import { Draggable } from './Draggable';
import { NodeListItem } from './NodeListItem';
import { NodeListItemDragImage } from './NodeListItemDragImage';
import { GridItem } from './StyledComponents';
import { useUserInfo } from '../../../hooks/useUserInfo';
import { draggedItemsVar } from '../../apollo/dragAndDropVar';
import { DRAG_TYPES, GRID_ITEM_MIN_WIDTH, LIST_ITEM_HEIGHT, VIEW_MODE } from '../../constants';
import { ListContext } from '../../contexts';
import { Action, NodeListItemType } from '../../types/common';
import { ActionsFactoryCheckerMap, getPermittedActions } from '../../utils/ActionsFactory';
import { cssCalcBuilder } from '../../utils/utils';

const DragImageContainer = styled.div<{ $isGrid: boolean }>`
	position: absolute;
	top: -5000px;
	left: -5000px;
	transform: translate(-100%, -100%);
	width: 100%;
	${({ $isGrid }): false | ReturnType<typeof css> =>
		$isGrid &&
		css`
			display: grid;
			grid-gap: 1rem;
			grid-template-columns: repeat(auto-fill, minmax(${GRID_ITEM_MIN_WIDTH}, 1fr));
		`};
`;

const Grid = styled(ListV2)`
	& > div {
		padding-left: 1rem;
		padding-right: 1rem;
		padding-top: 1rem;
		display: grid;
		grid-gap: 1rem;
		grid-template-columns: repeat(auto-fill, minmax(${GRID_ITEM_MIN_WIDTH}, 1fr));
	}
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
	const { viewMode } = useContext(ListContext);

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
				const permittedActions = getPermittedActions(
					nodesToDrag,
					[Action.Move, Action.MoveToTrash],
					me,
					undefined,
					undefined,
					customCheckers
				);

				const draggedItemsTmp = nodesToDrag.reduce<React.JSX.Element[]>(
					(accumulator, nodeToDrag, currentIndex) => {
						if (
							currentIndex > 0 &&
							((nodeToDrag.__typename === 'File' &&
								nodesToDrag[currentIndex - 1].__typename === 'Folder') ||
								(nodeToDrag.__typename === 'Folder' &&
									nodesToDrag[currentIndex - 1].__typename === 'File'))
						) {
							accumulator.push(
								<GridItem key={'grid-row-filler'} height={0} $columnStart={1} $columnEnd={-1} />
							);
						}
						accumulator.push(
							<NodeListItemDragImage node={nodeToDrag} key={`dragged-${nodeToDrag.id}`} />
						);
						return accumulator;
					},
					[]
				);

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
		const nodeElements = nodes.reduce<React.JSX.Element[]>((accumulator, node, currentIndex) => {
			if (
				currentIndex > 0 &&
				((node.__typename === 'File' && nodes[currentIndex - 1].__typename === 'Folder') ||
					(node.__typename === 'Folder' && nodes[currentIndex - 1].__typename === 'File'))
			) {
				accumulator.push(
					<GridItem key={'grid-row-filler'} height={0} $columnStart={1} $columnEnd={-1} />
				);
			}
			accumulator.push(
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
			);
			return accumulator;
		}, []);

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
			{viewMode === VIEW_MODE.grid ? (
				<Grid
					height={'auto'}
					maxHeight={'100%'}
					data-testid={'main-grid'}
					onListBottom={hasMore ? loadMore : undefined}
					intersectionObserverInitOptions={intersectionObserverInitOptions}
				>
					{items}
				</Grid>
			) : (
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
			)}
			<DragImageContainer $isGrid={viewMode === VIEW_MODE.grid} ref={dragImageRef}>
				{dragImage}
			</DragImageContainer>
		</>
	);
};
