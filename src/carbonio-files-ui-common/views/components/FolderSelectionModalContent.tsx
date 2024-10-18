/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ReactiveVar, useApolloClient, useReactiveVar } from '@apollo/client';
import {
	Checkbox,
	Divider,
	ModalFooter,
	ModalHeader,
	Row,
	Text
} from '@zextras/carbonio-design-system';
import { noop } from 'lodash';
import { useTranslation } from 'react-i18next';

import { ModalFooterCustom } from './ModalFooterCustom';
import { ModalList } from './ModalList';
import { ModalRootsList } from './ModalRootsList';
import { CustomModalBody } from './StyledComponents';
import { destinationVar, DestinationVar } from '../../apollo/destinationVar';
import { ROOTS } from '../../constants';
import { useGetChildrenQuery } from '../../hooks/graphql/queries/useGetChildrenQuery';
import { useGetPathQuery } from '../../hooks/graphql/queries/useGetPathQuery';
import { useDestinationVarManager } from '../../hooks/useDestinationVarManager';
import { Node } from '../../types/common';
import { BaseNodeFragment, BaseNodeFragmentDoc, Folder } from '../../types/graphql/types';
import { isFile, isFolder } from '../../utils/utils';

interface FolderSelectionModalContentProps {
	folderId?: string;
	cascadeDefault?: boolean;
	confirmAction: (folder: Pick<Folder, 'id' | 'name'>, cascade: boolean) => void;
	closeAction?: () => void;
}

type SelectedNode = Pick<Folder, 'id' | 'name'>;

export const FolderSelectionModalContent = ({
	folderId,
	cascadeDefault = true,
	confirmAction,
	closeAction
}: FolderSelectionModalContentProps): React.JSX.Element => {
	const [t] = useTranslation();
	const { setCurrent, setDefault } = useDestinationVarManager<SelectedNode | null>();
	const { currentValue } = useReactiveVar<DestinationVar<SelectedNode | null>>(
		destinationVar as ReactiveVar<DestinationVar<SelectedNode | null>>
	);
	const { data: currentFilterPathData } = useGetPathQuery(
		folderId !== ROOTS.SHARED_WITH_ME ? folderId : undefined
	);
	const [selectedFolder, setSelectedFolder] = useState<SelectedNode | null | undefined>();
	const [cascade, setCascade] = useState(cascadeDefault);
	const [openedFolderId, setOpenedFolderId] = useState<string>('');
	const { data: currentFolder, loading, hasMore, loadMore } = useGetChildrenQuery(openedFolderId);
	const mainContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setSelectedFolder(currentValue);
	}, [currentValue]);

	useEffect(() => {
		if (currentFilterPathData?.getPath) {
			const { length } = currentFilterPathData.getPath;
			if (length > 0) {
				setCurrent(currentFilterPathData.getPath[length - 1] ?? undefined);
				if (length > 1) {
					setOpenedFolderId(currentFilterPathData.getPath[length - 2]?.id ?? '');
					setDefault(currentFilterPathData.getPath[length - 2]);
				}
			}
		} else if (folderId) {
			setCurrent({
				id: folderId,
				name: t('node.alias.name', folderId, { context: folderId })
			});
		} else {
			setCurrent(undefined);
		}
	}, [currentFilterPathData, folderId, setCurrent, setDefault, t]);

	const checkSelectable = useCallback((node: Node | { __typename?: never }) => !isFile(node), []);

	const checkDisabled = useCallback((node: Node | { __typename?: never }) => isFile(node), []);

	const nodes = useMemo(() => {
		if (
			currentFolder?.getNode &&
			isFolder(currentFolder.getNode) &&
			currentFolder.getNode.children?.nodes &&
			currentFolder.getNode.children.nodes.length > 0
		) {
			return currentFolder.getNode.children.nodes.reduce<
				((typeof currentFolder.getNode.children.nodes)[number] & {
					disabled: boolean;
					selectable: boolean;
				})[]
			>((result, node) => {
				if (node) {
					result.push({
						...node,
						disabled: checkDisabled(node),
						selectable: checkSelectable(node)
					});
				}
				return result;
			}, []);
		}
		return [];
	}, [checkDisabled, checkSelectable, currentFolder]);

	const closeHandler = useCallback(() => {
		closeAction && closeAction();
	}, [closeAction]);

	const confirmHandler = useCallback(() => {
		if (selectedFolder) {
			confirmAction(selectedFolder, cascade);
			closeHandler();
		}
	}, [selectedFolder, confirmAction, cascade, closeHandler]);

	const apolloClient = useApolloClient();

	const navigateTo = useCallback(
		(id: string) => {
			setOpenedFolderId(id);
			const node = id
				? apolloClient.cache.readFragment<BaseNodeFragment>({
						fragment: BaseNodeFragmentDoc,
						fragmentName: 'BaseNode',
						// assuming it's a folder, not the best solution
						id: apolloClient.cache.identify({ __typename: 'Folder', id }),
						returnPartialData: true
					})
				: null;
			const nodeToSet = node?.id !== undefined ? node : null;
			setCurrent(nodeToSet);
			setDefault(nodeToSet);
		},
		[apolloClient, setCurrent, setDefault]
	);

	const setDestinationFolderHandler = useCallback(
		(node: (SelectedNode & { disabled?: boolean }) | null, event: React.SyntheticEvent | Event) => {
			const destination =
				(node && !node.disabled && node) ||
				(openedFolderId === currentFolder?.getNode?.id && currentFolder.getNode) ||
				undefined;
			setCurrent(destination);
			event.stopPropagation();
		},
		[currentFolder?.getNode, openedFolderId, setCurrent]
	);

	const toggleCascade = useCallback((event: React.SyntheticEvent | Event) => {
		setCascade((prevState) => !prevState);
		event.stopPropagation();
	}, []);

	const confirmDisabled = useMemo(
		() => !selectedFolder || (selectedFolder.id === folderId && cascade === cascadeDefault),
		[selectedFolder, folderId, cascade, cascadeDefault]
	);

	return (
		<>
			<ModalHeader
				title={t('search.advancedSearch.modal.folder.modal.title', 'Select a folder')}
				onClose={closeHandler}
				showCloseIcon
				closeIconTooltip={t('modal.close.tooltip', 'Close')}
			/>
			<Divider />
			<CustomModalBody ref={mainContainerRef}>
				<Text overflow="break-word" size="small">
					{t(
						'search.advancedSearch.modal.folder.modal.subtitle',
						'Result will be searched only inside the selected folder'
					)}
				</Text>
				{currentFolder?.getNode ? (
					<ModalList
						folderId={currentFolder.getNode.id}
						nodes={nodes}
						activeNodes={selectedFolder?.id}
						setActiveNode={setDestinationFolderHandler}
						loadMore={loadMore}
						hasMore={hasMore}
						navigateTo={navigateTo}
						loading={loading}
						limitNavigation={false}
						allowRootNavigation
					/>
				) : (
					(!loading && (
						<ModalRootsList
							activeNodes={selectedFolder?.id}
							setActiveNode={setDestinationFolderHandler}
							navigateTo={navigateTo}
							checkDisabled={checkDisabled}
							checkSelectable={checkSelectable}
							showTrash
						/>
					)) || (
						<ModalList
							folderId=""
							nodes={[]}
							setActiveNode={noop}
							loadMore={noop}
							hasMore={false}
							navigateTo={noop}
							loading
							activeNodes={undefined}
						/>
					)
				)}
				<Row padding={{ top: 'large', bottom: 'small' }} mainAlignment="flex-start">
					<Checkbox
						value={cascade}
						onClick={toggleCascade}
						label={t(
							'search.advancedSearch.modal.folder.modal.cascade',
							'search also in contained folders'
						)}
					/>
				</Row>
			</CustomModalBody>
			<ModalFooter
				customFooter={
					<ModalFooterCustom
						confirmLabel={t('search.advancedSearch.modal.folder.modal.confirm', 'Choose folder')}
						confirmHandler={confirmHandler}
						confirmDisabled={confirmDisabled}
						cancelHandler={closeHandler}
						cancelLabel={t('search.advancedSearch.modal.folder.modal.cancel', 'Go back')}
						cancelButtonColor="secondary"
					/>
				}
			/>
		</>
	);
};
