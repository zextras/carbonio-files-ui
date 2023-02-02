/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ReactiveVar, useApolloClient, useReactiveVar } from '@apollo/client';
import {
	Container,
	Divider,
	ModalFooter,
	ModalHeader,
	Text,
	TextWithTooltip
} from '@zextras/carbonio-design-system';
import { find, reduce, every } from 'lodash';
import { useTranslation } from 'react-i18next';

import { DestinationVar, destinationVar } from '../../apollo/destinationVar';
import { nodeSortVar } from '../../apollo/nodeSortVar';
import { NODES_LOAD_LIMIT } from '../../constants';
import GET_CHILDREN from '../../graphql/queries/getChildren.graphql';
import { useCopyNodesMutation } from '../../hooks/graphql/mutations/useCopyNodesMutation';
import { useGetChildrenQuery } from '../../hooks/graphql/queries/useGetChildrenQuery';
import { useDestinationVarManager } from '../../hooks/useDestinationVarManager';
import { GetNodeParentType, Node, NodeListItemType, RootListItemType } from '../../types/common';
import { Folder, GetChildrenQuery, GetChildrenQueryVariables } from '../../types/graphql/types';
import { canBeCopyDestination, isRoot } from '../../utils/ActionsFactory';
import { isFile, isFolder } from '../../utils/utils';
import { ModalFooterCustom } from './ModalFooterCustom';
import { ModalList } from './ModalList';
import { ModalRootsList } from './ModalRootsList';
import { CustomModalBody } from './StyledComponents';

interface CopyNodesModalContentProps {
	nodesToCopy: Array<Pick<Node, '__typename' | 'id'> & GetNodeParentType>;
	folderId?: string;
	closeAction?: () => void;
}

export const CopyNodesModalContent: React.VFC<CopyNodesModalContentProps> = ({
	closeAction,
	nodesToCopy,
	folderId
}) => {
	const [t] = useTranslation();
	const { setCurrent, setDefault } = useDestinationVarManager<string>();
	const { currentValue } = useReactiveVar<DestinationVar<string>>(
		destinationVar as ReactiveVar<DestinationVar<string>>
	);
	const [destinationFolder, setDestinationFolder] = useState<string>();
	const [openedFolder, setOpenedFolder] = useState<string>(folderId || '');
	const { data: currentFolder, loading, hasMore, loadMore } = useGetChildrenQuery(openedFolder);
	const mainContainerRef = useRef<HTMLDivElement>(null);
	const footerContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setDestinationFolder(currentValue);
	}, [currentValue]);

	/** Mutation to copy nodes */
	const { copyNodes, loading: copyNodesMutationLoading } = useCopyNodesMutation();

	const title = useMemo(
		() => (
			<TextWithTooltip weight="bold">
				{t('node.copy.modal.title', 'Copy items', {
					count: nodesToCopy.length,
					replace: { node: nodesToCopy.length === 1 && nodesToCopy[0] }
				})}
			</TextWithTooltip>
		),
		[nodesToCopy, t]
	);

	useEffect(() => {
		if (folderId) {
			setOpenedFolder(folderId);
			setDestinationFolder(folderId);
		} else if (nodesToCopy.length === 1 && nodesToCopy[0].parent) {
			// case when modal is opened from a filter
			// folderId is not set but nodes have parent
			setOpenedFolder(nodesToCopy[0].parent.id);
			setDestinationFolder(nodesToCopy[0].parent.id);
		} else {
			const commonParent = every(
				nodesToCopy,
				(node) => node.parent?.id === nodesToCopy[0].parent?.id
			);
			if (nodesToCopy[0].parent && commonParent) {
				// case when modal is opened from multiple nodes with same parent
				// open modal showing parent folder content
				setOpenedFolder(nodesToCopy[0].parent.id);
				setDestinationFolder(nodesToCopy[0].parent.id);
			} else {
				// case when modal is opened from multiple nodes with different parents
				// open modal showing roots
			}
		}
	}, [folderId, nodesToCopy]);

	const copyingFile = useMemo(
		() => find(nodesToCopy, (node) => isFile(node)) !== undefined,
		[nodesToCopy]
	);

	const copyingFolder = useMemo(
		() => find(nodesToCopy, (node) => isFolder(node)) !== undefined,
		[nodesToCopy]
	);

	const checkSelectable = useCallback(
		(node: Pick<NodeListItemType, '__typename' | 'permissions' | 'id'> | RootListItemType) =>
			// a node is selectable if it can be a copy destination
			isFolder(node) && canBeCopyDestination(node, nodesToCopy),
		[nodesToCopy]
	);

	const checkDisabled = useCallback(
		(node: Pick<NodeListItemType, '__typename' | 'permissions' | 'id'> | RootListItemType) =>
			// a node is disabled (not interactive) if it is a file or if it is a folder which is not selectable
			// roots which are not a file and not a folder are enabled
			isFile(node) || (isFolder(node) && !checkSelectable(node)),
		[checkSelectable]
	);

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
						result.push({
							...node,
							disabled: checkDisabled(node),
							selectable: checkSelectable(node)
						});
					}
					return result;
				},
				[]
			);
		}
		return [];
	}, [checkDisabled, checkSelectable, currentFolder?.getNode]);

	const closeHandler = useCallback(() => {
		closeAction && closeAction();
	}, [closeAction]);

	const apolloClient = useApolloClient();

	const confirmHandler = useCallback(
		(e: Event | React.SyntheticEvent) => {
			e.stopPropagation();
			let destinationFolderNode;
			if (destinationFolder === currentFolder?.getNode?.id) {
				destinationFolderNode = currentFolder?.getNode;
			} else if (destinationFolder) {
				const node = find(nodes, ['id', destinationFolder]);
				if (node) {
					destinationFolderNode = node;
				} else {
					// case when a root folder is selected from the roots list
					const cachedData = apolloClient.readQuery<GetChildrenQuery, GetChildrenQueryVariables>({
						query: GET_CHILDREN,
						variables: {
							node_id: destinationFolder,
							children_limit: NODES_LOAD_LIMIT,
							sort: nodeSortVar()
						}
					});
					destinationFolderNode = cachedData?.getNode || {
						__typename: 'Folder',
						id: destinationFolder
					};
				}
			}

			if (destinationFolderNode) {
				copyNodes(destinationFolderNode as Folder, ...nodesToCopy).then((result) => {
					// TODO: handle case when not all nodes are copied
					if (result?.data) {
						closeHandler();
					}
				});
			}
		},
		[
			destinationFolder,
			currentFolder?.getNode,
			nodes,
			apolloClient,
			copyNodes,
			nodesToCopy,
			closeHandler
		]
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
		(
			node: Pick<NodeListItemType, 'id' | '__typename' | 'disabled'> | RootListItemType,
			event: React.SyntheticEvent | Event
		) => {
			const destinationId =
				(node && !isRoot(node) && !node.disabled && node.id) || currentFolder?.getNode?.id;
			if (isFolder(node)) {
				setCurrent(destinationId);
				event.stopPropagation();
			}
		},
		[currentFolder?.getNode?.id, setCurrent]
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
				{currentFolder?.getNode ? (
					<ModalList
						folderId={currentFolder.getNode.id}
						nodes={nodes}
						activeNodes={destinationFolder}
						setActiveNode={setDestinationFolderHandler}
						loadMore={loadMore}
						hasMore={hasMore}
						navigateTo={navigateTo}
						loading={loading}
						limitNavigation={false}
						writingFolder={copyingFolder}
						writingFile={copyingFile}
						allowRootNavigation
					/>
				) : (
					(!loading && (
						<ModalRootsList
							activeNodes={destinationFolder}
							setActiveNode={setDestinationFolderHandler}
							navigateTo={navigateTo}
							checkDisabled={checkDisabled}
							checkSelectable={checkSelectable}
						/>
					)) || <Container />
				)}
			</CustomModalBody>
			<Divider />
			<ModalFooter
				customFooter={
					<ModalFooterCustom
						confirmLabel={t('node.copy.modal.button.confirm', 'Copy')}
						confirmHandler={confirmHandler}
						confirmDisabled={!destinationFolder || copyNodesMutationLoading}
						confirmDisabledTooltip={t(
							'node.copy.modal.button.tooltip.confirm',
							"You can't perform this action here"
						)}
						ref={footerContainerRef}
					/>
				}
			/>
		</>
	);
};
