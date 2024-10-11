/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ReactiveVar, useReactiveVar } from '@apollo/client';
import {
	Divider,
	ModalFooter,
	ModalHeader,
	Text,
	TextWithTooltip
} from '@zextras/carbonio-design-system';
import { find } from 'lodash';
import { useTranslation } from 'react-i18next';

import { ModalFooterCustom } from './ModalFooterCustom';
import { ModalList } from './ModalList';
import { CustomModalBody } from './StyledComponents';
import { DestinationVar, destinationVar } from '../../apollo/destinationVar';
import { useMoveNodesMutation } from '../../hooks/graphql/mutations/useMoveNodesMutation';
import { useGetChildrenQuery } from '../../hooks/graphql/queries/useGetChildrenQuery';
import { useDestinationVarManager } from '../../hooks/useDestinationVarManager';
import { Node } from '../../types/common';
import { DeepPick } from '../../types/utils';
import { canBeMoveDestination } from '../../utils/ActionsFactory';
import { isFile, isFolder } from '../../utils/utils';

type NodeToMove = Node<'id' | 'permissions' | 'rootId'> &
	DeepPick<Node<'parent'>, 'parent', 'id' | 'permissions' | '__typename'> &
	DeepPick<Node<'owner'>, 'owner', 'id'>;

type NodeItem = Node<'id' | 'name' | 'type' | 'rootId', 'mime_type'> & {
	disabled: boolean;
	selectable: boolean;
};
interface MoveNodesModalContentProps {
	nodesToMove: NodeToMove[];
	folderId: string;
	closeAction?: () => void;
}

export const MoveNodesModalContent = ({
	closeAction,
	nodesToMove,
	folderId
}: MoveNodesModalContentProps): React.JSX.Element => {
	const [t] = useTranslation();
	const { setCurrent, setDefault } = useDestinationVarManager<string>();
	const { currentValue } = useReactiveVar<DestinationVar<string>>(
		destinationVar as ReactiveVar<DestinationVar<string>>
	);
	const [destinationFolder, setDestinationFolder] = useState<string>();
	const [openedFolder, setOpenedFolder] = useState<string>(folderId || '');
	const { data: currentFolder, loadMore, hasMore, loading } = useGetChildrenQuery(openedFolder);
	const mainContainerRef = useRef<HTMLDivElement>(null);
	const footerContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setDestinationFolder(currentValue);
	}, [currentValue]);

	/** Mutation to move nodes */
	const { moveNodes, loading: moveNodesMutationLoading } = useMoveNodesMutation();

	const title = useMemo(
		() => (
			<TextWithTooltip weight="bold">
				{t('node.move.modal.title', {
					defaultValue_one: 'Move {{node.name}}',
					defaultValue_other: 'Move items',
					count: nodesToMove.length,
					replace: { node: nodesToMove.length === 1 && nodesToMove[0] }
				})}
			</TextWithTooltip>
		),
		[nodesToMove, t]
	);

	const movingFile = useMemo(
		() => find(nodesToMove, (node) => isFile(node)) !== undefined,
		[nodesToMove]
	);

	const movingFolder = useMemo(
		() => find(nodesToMove, (node) => isFolder(node)) !== undefined,
		[nodesToMove]
	);

	const nodes = useMemo(() => {
		if (
			currentFolder?.getNode &&
			isFolder(currentFolder.getNode) &&
			currentFolder.getNode.children?.nodes &&
			currentFolder.getNode.children.nodes.length > 0
		) {
			return currentFolder.getNode.children.nodes.reduce<NodeItem[]>((result, node) => {
				if (node) {
					// in move modal, if a node cannot be a move destination, then it is fully disabled
					// and cannot be navigated if it is a folder (out of workspace)
					const isSelectable = canBeMoveDestination(node, nodesToMove);
					result.push({
						...node,
						disabled: !isSelectable,
						selectable: isSelectable
					});
				}
				return result;
			}, []);
		}
		return [];
	}, [currentFolder, nodesToMove]);

	const closeHandler = useCallback(() => {
		closeAction && closeAction();
	}, [closeAction]);

	const confirmHandler = useCallback(
		(e: React.SyntheticEvent | KeyboardEvent) => {
			e && e.stopPropagation();
			const destinationFolderNode =
				destinationFolder === currentFolder?.getNode?.id
					? currentFolder?.getNode
					: find(nodes, ['id', destinationFolder]);

			// reset the opened folder so that the eviction of the children in the mutation does not run a new network query
			if (destinationFolderNode && isFolder(destinationFolderNode)) {
				moveNodes(destinationFolderNode, ...nodesToMove).then((result) => {
					if (result.data?.moveNodes?.length === nodesToMove.length) {
						closeHandler();
					}
				});
			}
		},
		[destinationFolder, currentFolder, nodes, moveNodes, nodesToMove, closeHandler]
	);

	const navigateTo = useCallback(
		(id: string) => {
			setOpenedFolder(id);
			setCurrent(id);
			setDefault(id);
		},
		[setCurrent, setDefault]
	);

	const setDestinationFolderHandler = useCallback(
		(node: NodeItem, event: React.SyntheticEvent) => {
			const destinationId = (node && !node.disabled && node.id) || currentFolder?.getNode?.id;
			setCurrent(destinationId);
			event.stopPropagation();
		},
		[currentFolder, setCurrent]
	);

	return (
		<>
			<ModalHeader
				title={title}
				onClose={closeHandler}
				showCloseIcon
				closeIconTooltip={t('modal.close.tooltip', 'Close')}
			/>
			<Divider />
			<CustomModalBody ref={mainContainerRef}>
				<Text overflow="break-word" size="small">
					{t('node.move.modal.subtitle', 'Select a destination folder:')}
				</Text>
				<ModalList
					folderId={currentFolder?.getNode?.id ?? ''}
					nodes={nodes}
					activeNodes={destinationFolder}
					setActiveNode={setDestinationFolderHandler}
					loadMore={loadMore}
					hasMore={hasMore}
					navigateTo={navigateTo}
					loading={loading}
					writingFile={movingFile}
					writingFolder={movingFolder}
					limitNavigation
				/>
			</CustomModalBody>
			<Divider />
			<ModalFooter
				customFooter={
					<ModalFooterCustom
						confirmLabel={t('node.move.modal.button.confirm', 'Move')}
						confirmHandler={confirmHandler}
						confirmDisabled={
							!destinationFolder || destinationFolder === folderId || moveNodesMutationLoading
						}
						confirmDisabledTooltip={t(
							'node.move.modal.button.tooltip.confirm',
							"You can't perform this action here"
						)}
						ref={footerContainerRef}
					/>
				}
			/>
		</>
	);
};
