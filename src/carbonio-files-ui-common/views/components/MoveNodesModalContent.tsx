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
import { find, reduce } from 'lodash';
import { useTranslation } from 'react-i18next';

import useUserInfo from '../../../hooks/useUserInfo';
import { DestinationVar, destinationVar } from '../../apollo/destinationVar';
import { useMoveNodesMutation } from '../../hooks/graphql/mutations/useMoveNodesMutation';
import { useGetChildrenQuery } from '../../hooks/graphql/queries/useGetChildrenQuery';
import { useDestinationVarManager } from '../../hooks/useDestinationVarManager';
import { Node, NodeListItemType } from '../../types/common';
import { Folder, GetChildrenQuery } from '../../types/graphql/types';
import { canBeMoveDestination } from '../../utils/ActionsFactory';
import { isFile, isFolder } from '../../utils/utils';
import { ModalFooterCustom } from './ModalFooterCustom';
import { ModalList } from './ModalList';
import { CustomModalBody } from './StyledComponents';

interface MoveNodesModalContentProps {
	nodesToMove: Array<Pick<Node, '__typename' | 'id' | 'owner'>>;
	folderId: string;
	closeAction?: () => void;
}

export const MoveNodesModalContent: React.VFC<MoveNodesModalContentProps> = ({
	closeAction,
	nodesToMove,
	folderId
}) => {
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
				{t('node.move.modal.title', 'Move items', {
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

	const { me } = useUserInfo();

	const nodes = useMemo<Array<NodeListItemType>>(() => {
		if (
			currentFolder?.getNode &&
			isFolder(currentFolder.getNode) &&
			currentFolder.getNode.children?.nodes &&
			currentFolder.getNode.children.nodes.length > 0
		) {
			return reduce(
				currentFolder.getNode.children.nodes,
				(result: NodeListItemType[], node) => {
					if (node) {
						// in move modal, if a node cannot be a move destination, then it is fully disabled
						// and cannot be navigated if it is a folder (out of workspace)
						const isSelectable = node && canBeMoveDestination(node, nodesToMove, me);
						result.push({
							...node,
							disabled: !isSelectable,
							selectable: isSelectable
						});
					}
					return result;
				},
				[]
			);
		}
		return [];
	}, [currentFolder, me, nodesToMove]);

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
			if (destinationFolderNode) {
				moveNodes(destinationFolderNode as Folder, ...nodesToMove).then((result) => {
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
		(node: Pick<NodeListItemType, 'id' | 'disabled'>, event: React.SyntheticEvent) => {
			const destinationId =
				(node && !node.disabled && node.id) || (currentFolder as GetChildrenQuery)?.getNode?.id;
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
					folderId={currentFolder?.getNode?.id || ''}
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
