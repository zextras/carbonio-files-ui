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
import { NodeListItemWrapper } from './NodeListItemWrapper';
import { useUserInfo } from '../../../hooks/useUserInfo';
import { draggedItemsVar } from '../../apollo/dragAndDropVar';
import { DRAG_TYPES, LIST_ITEM_HEIGHT } from '../../constants';
import { DeleteNodesType } from '../../hooks/graphql/mutations/useDeleteNodesMutation';
import { Action, GetNodeParentType, NodeListItemType, PickIdNodeType } from '../../types/common';
import { Node } from '../../types/graphql/types';
import { DeepPick, OneOrMany } from '../../types/utils';
import { ActionsFactoryCheckerMap, getPermittedActions } from '../../utils/ActionsFactory';
import { cssCalcBuilder, isFile } from '../../utils/utils';

const DragImageContainer = styled.div`
	position: absolute;
	top: -5000px;
	left: -5000px;
	transform: translate(-100%, -100%);
	width: 100%;
`;

interface ListContentProps {
	nodes: NodeListItemType[];
	selectedMap?: Record<string, boolean>;
	selectId?: (id: string) => void;
	isSelectionModeActive?: boolean;
	exitSelectionMode?: () => void;
	toggleFlag?: (flagValue: boolean, ...nodes: PickIdNodeType[]) => void;
	renameNode?: (node: Pick<Node, 'id' | 'name'>) => void;
	markNodesForDeletion?: (
		...nodes: Array<Pick<NodeListItemType, 'id'> & DeepPick<NodeListItemType, 'owner', 'id'>>
	) => void;
	restore?: (
		...nodes: Array<Pick<NodeListItemType, '__typename' | 'id'> & GetNodeParentType>
	) => void;
	deletePermanently?: DeleteNodesType;
	moveNodes?: (...nodes: Array<Pick<NodeListItemType, '__typename' | 'id' | 'owner'>>) => void;
	copyNodes?: (...nodes: Array<Pick<NodeListItemType, '__typename' | 'id'>>) => void;
	activeNodes?: OneOrMany<string>;
	setActiveNode?: (node: NodeListItemType, event: React.SyntheticEvent) => void;
	manageShares?: (nodeId: string) => void;
	compact?: boolean;
	navigateTo?: (id: string, event?: React.SyntheticEvent | Event) => void;
	hasMore?: boolean;
	loadMore?: () => void;
	draggable?: boolean;
	customCheckers?: ActionsFactoryCheckerMap;
	selectionContextualMenuActionsItems?: DSAction[];
	fillerWithActions?: React.JSX.Element;
}

export const ListContent = ({
	nodes,
	selectedMap = {},
	selectId,
	isSelectionModeActive,
	exitSelectionMode,
	toggleFlag,
	renameNode,
	markNodesForDeletion,
	restore,
	deletePermanently,
	moveNodes,
	copyNodes,
	activeNodes,
	setActiveNode,
	compact,
	navigateTo,
	hasMore = false,
	loadMore = (): void => undefined,
	draggable = false,
	customCheckers,
	selectionContextualMenuActionsItems,
	fillerWithActions,
	manageShares
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
						<NodeListItem
							key={`dragged-${nodeToDrag.id}`}
							id={`dragged-${nodeToDrag.id}`}
							name={nodeToDrag.name}
							type={nodeToDrag.type}
							extension={(isFile(nodeToDrag) && nodeToDrag.extension) || undefined}
							mimeType={(isFile(nodeToDrag) && nodeToDrag.mime_type) || undefined}
							updatedAt={nodeToDrag.updated_at}
							owner={nodeToDrag.owner}
							lastEditor={nodeToDrag.last_editor}
							incomingShare={me !== nodeToDrag.owner?.id}
							outgoingShare={
								me === nodeToDrag.owner?.id && nodeToDrag.shares && nodeToDrag.shares.length > 0
							}
							size={isFile(nodeToDrag) ? nodeToDrag.size : undefined}
							flagActive={nodeToDrag.flagged}
						/>
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
				draggable={draggable}
				onDragStart={dragStartHandler(node)}
				onDragEnd={dragEndHandler}
				key={node.id}
				effect="move"
			>
				<NodeListItemWrapper
					node={node}
					toggleFlag={toggleFlag}
					markNodesForDeletion={markNodesForDeletion}
					restore={restore}
					deletePermanently={deletePermanently}
					moveNodes={moveNodes}
					copyNodes={copyNodes}
					manageShares={manageShares}
					isSelected={selectedMap && selectedMap[node.id]}
					isSelectionModeActive={isSelectionModeActive}
					selectId={selectId}
					exitSelectionMode={exitSelectionMode}
					renameNode={renameNode}
					isActive={
						activeNodes === node.id ||
						(activeNodes instanceof Array && activeNodes.includes(node.id))
					}
					setActive={setActiveNode}
					compact={compact}
					navigateTo={navigateTo}
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
		draggable,
		dragStartHandler,
		dragEndHandler,
		toggleFlag,
		markNodesForDeletion,
		restore,
		deletePermanently,
		moveNodes,
		copyNodes,
		manageShares,
		selectedMap,
		isSelectionModeActive,
		selectId,
		exitSelectionMode,
		renameNode,
		activeNodes,
		setActiveNode,
		compact,
		navigateTo,
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
