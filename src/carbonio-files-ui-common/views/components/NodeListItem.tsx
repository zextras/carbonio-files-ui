/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';

import {
	Action as DSAction,
	Container,
	Icon,
	Padding,
	Row,
	Text,
	useSnackbar
} from '@zextras/carbonio-design-system';
import { PreviewsManagerContext } from '@zextras/carbonio-ui-preview';
import { includes, some, debounce } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { useSendViaMail } from '../../../hooks/useSendViaMail';
import useUserInfo from '../../../hooks/useUserInfo';
import {
	DOUBLE_CLICK_DELAY,
	LIST_ITEM_AVATAR_HEIGHT,
	LIST_ITEM_HEIGHT,
	LIST_ITEM_HEIGHT_COMPACT,
	PREVIEW_TYPE,
	ROOTS
} from '../../constants';
import { Action } from '../../types/common';
import { NodeType, User } from '../../types/graphql/types';
import { buildActionItems } from '../../utils/ActionsFactory';
import {
	downloadNode,
	formatDate,
	getIconByFileType,
	getListItemAvatarPictureUrl,
	humanFileSize,
	openNodeWithDocs,
	isSupportedByPreview,
	isSearchView,
	cssCalcBuilder
} from '../../utils/utils';
import { ContextualMenu } from './ContextualMenu';
import { NodeAvatarIcon } from './NodeAvatarIcon';
import { NodeHoverBar } from './NodeHoverBar';
import { HoverContainer, ListItemContainer } from './StyledComponents';

const CustomText = styled(Text)`
	text-transform: uppercase;
`;

interface NodeListItemProps {
	id: string;
	name: string;
	type: NodeType;
	extension?: string | null;
	mimeType?: string;
	updatedAt?: number;
	size?: number;
	owner?: User;
	lastEditor?: User | null;
	incomingShare?: boolean;
	outgoingShare?: boolean;
	linkActive?: boolean;
	flagActive?: boolean;
	toggleFlagTrue?: () => void;
	toggleFlagFalse?: () => void;
	markNodesForDeletionCallback?: () => void;
	restoreNodeCallback?: () => void;
	moveNodesCallback?: () => void;
	copyNodesCallback?: () => void;
	manageSharesCallback?: () => void;
	// Selection props
	isSelected?: boolean;
	isSelectionModeActive?: boolean;
	selectId?: (id: string) => void;
	permittedHoverBarActions?: Action[];
	permittedContextualMenuActions?: Action[];
	renameNode?: () => void;
	isActive?: boolean;
	setActive?: (event: React.SyntheticEvent) => void;
	compact?: boolean;
	navigateTo?: (id: string, event?: React.SyntheticEvent | Event) => void;
	disabled?: boolean;
	selectable?: boolean;
	trashed?: boolean;
	deletePermanentlyCallback?: () => void;
	selectionContextualMenuActionsItems?: DSAction[];
	dragging?: boolean;
	version?: number;
}

const NodeListItemComponent: React.VFC<NodeListItemProps> = ({
	id,
	name,
	type,
	extension,
	mimeType,
	updatedAt,
	size,
	owner,
	lastEditor,
	incomingShare = false,
	outgoingShare = false,
	linkActive = false,
	flagActive = false,
	toggleFlagTrue,
	toggleFlagFalse,
	markNodesForDeletionCallback,
	restoreNodeCallback,
	moveNodesCallback,
	copyNodesCallback,
	manageSharesCallback,
	// Selection props
	isSelected,
	isSelectionModeActive,
	selectId,
	permittedHoverBarActions = [],
	permittedContextualMenuActions = [],
	renameNode,
	isActive,
	setActive = (): void => undefined,
	compact,
	navigateTo = (): void => undefined,
	disabled = false,
	selectable = true,
	trashed,
	deletePermanentlyCallback,
	selectionContextualMenuActionsItems,
	dragging = false,
	version
}) => {
	const [t] = useTranslation();
	const { openPreview } = useContext(PreviewsManagerContext);
	const location = useLocation();
	const userInfo = useUserInfo();
	const [isContextualMenuActive, setIsContextualMenuActive] = useState(false);
	const selectIdCallback = useCallback(
		(event: React.SyntheticEvent) => {
			if (selectId) {
				event.preventDefault();
				selectId(id);
			}
		},
		[id, selectId]
	);

	const createSnackbar = useSnackbar();

	const { sendViaMail } = useSendViaMail();

	const sendViaMailCallback = useCallback(() => {
		sendViaMail(id);
	}, [id, sendViaMail]);

	const isNavigable = useMemo(
		() =>
			type === NodeType.Folder || type === NodeType.Root || some(ROOTS, (rootId) => rootId === id),
		[id, type]
	);

	const [$isSupportedByPreview] = useMemo<
		[boolean, typeof PREVIEW_TYPE[keyof typeof PREVIEW_TYPE] | undefined]
	>(() => isSupportedByPreview(mimeType), [mimeType]);

	const openNode = useCallback(
		(event: React.SyntheticEvent | KeyboardEvent) => {
			// remove text selection on double click
			if (window.getSelection) {
				const selection = window.getSelection();
				selection && selection.removeAllRanges();
			}

			if (!isSelectionModeActive && !disabled && !trashed) {
				if (isNavigable) {
					navigateTo(id, event);
				} else if (includes(permittedContextualMenuActions, Action.Edit)) {
					// if node can be opened with docs on edit mode, open editor
					openNodeWithDocs(id);
				} else if ($isSupportedByPreview) {
					openPreview(id);
				} else if (includes(permittedContextualMenuActions, Action.OpenWithDocs)) {
					// if preview is not supported and document can be opened with docs, open editor
					openNodeWithDocs(id);
				}
			}
		},
		[
			isSelectionModeActive,
			disabled,
			trashed,
			isNavigable,
			permittedContextualMenuActions,
			$isSupportedByPreview,
			navigateTo,
			id,
			openPreview
		]
	);

	const itemsMap = useMemo<Partial<Record<Action, DSAction>>>(
		() => ({
			[Action.Edit]: {
				id: 'Edit',
				icon: 'Edit2Outline',
				label: t('actions.edit', 'Edit'),
				onClick: (): void => {
					openNodeWithDocs(id);
				}
			},
			[Action.Preview]: {
				id: 'Preview',
				icon: 'MaximizeOutline',
				label: t('actions.preview', 'Preview'),
				onClick: openNode
			},
			[Action.SendViaMail]: {
				id: 'SendViaMail',
				icon: 'EmailOutline',
				label: t('actions.sendViaMail', 'Send via mail'),
				onClick: sendViaMailCallback
			},
			[Action.Download]: {
				id: 'Download',
				icon: 'Download',
				label: t('actions.download', 'Download'),
				onClick: (): void => {
					// download node without version to be sure last version is downloaded
					downloadNode(id);
					createSnackbar({
						key: new Date().toLocaleString(),
						type: 'info',
						label: t('snackbar.download.start', 'Your download will start soon'),
						replace: true,
						hideButton: true
					});
				}
			},
			[Action.ManageShares]: {
				id: 'ManageShares',
				icon: 'ShareOutline',
				label: t('actions.manageShares', 'Manage Shares'),
				onClick: (): void => {
					manageSharesCallback && manageSharesCallback();
				}
			},
			[Action.Flag]: {
				id: 'Flag',
				icon: 'FlagOutline',
				label: t('actions.flag', 'Flag'),
				onClick: (): void => {
					toggleFlagTrue && toggleFlagTrue();
				}
			},
			[Action.UnFlag]: {
				id: 'Unflag',
				icon: 'UnflagOutline',
				label: t('actions.unflag', 'Unflag'),
				onClick: (): void => {
					toggleFlagFalse && toggleFlagFalse();
				}
			},
			[Action.OpenWithDocs]: {
				id: 'OpenWithDocs',
				icon: 'BookOpenOutline',
				label: t('actions.openWithDocs', 'Open document'),
				onClick: (): void => {
					openNodeWithDocs(id);
				}
			},
			[Action.Copy]: {
				id: 'Copy',
				icon: 'Copy',
				label: t('actions.copy', 'Copy'),
				onClick: (): void => {
					copyNodesCallback && copyNodesCallback();
				}
			},
			[Action.Move]: {
				id: 'Move',
				icon: 'MoveOutline',
				label: t('actions.move', 'Move'),
				onClick: (): void => {
					moveNodesCallback && moveNodesCallback();
				}
			},
			[Action.Rename]: {
				id: 'Rename',
				icon: 'Edit2Outline',
				label: t('actions.rename', 'Rename'),
				onClick: (): void => {
					renameNode && renameNode();
				}
			},
			[Action.MoveToTrash]: {
				id: 'MarkForDeletion',
				icon: 'Trash2Outline',
				label: t('actions.moveToTrash', 'Move to Trash'),
				onClick: (): void => {
					markNodesForDeletionCallback && markNodesForDeletionCallback();
				}
			},
			[Action.Restore]: {
				id: 'Restore',
				icon: 'RestoreOutline',
				label: t('actions.restore', 'Restore'),
				onClick: (): void => {
					restoreNodeCallback && restoreNodeCallback();
				}
			},
			[Action.DeletePermanently]: {
				id: 'DeletePermanently',
				icon: 'DeletePermanentlyOutline',
				label: t('actions.deletePermanently', 'Delete Permanently'),
				onClick: (): void => {
					deletePermanentlyCallback && deletePermanentlyCallback();
				}
			}
		}),
		[
			t,
			openNode,
			sendViaMailCallback,
			manageSharesCallback,
			toggleFlagTrue,
			toggleFlagFalse,
			copyNodesCallback,
			moveNodesCallback,
			renameNode,
			markNodesForDeletionCallback,
			restoreNodeCallback,
			deletePermanentlyCallback,
			id,
			createSnackbar
		]
	);

	const permittedHoverBarActionsItems = useMemo(
		() => buildActionItems(itemsMap, permittedHoverBarActions),
		[itemsMap, permittedHoverBarActions]
	);

	const permittedContextualMenuActionsItems = useMemo(
		() => buildActionItems(itemsMap, permittedContextualMenuActions),
		[itemsMap, permittedContextualMenuActions]
	);

	const setActiveDebounced = useMemo(
		() =>
			debounce(
				(event: React.SyntheticEvent) => {
					setActive(event);
				},
				DOUBLE_CLICK_DELAY,
				{ leading: false, trailing: true }
			),
		[setActive]
	);

	const doubleClickHandler = useCallback(
		(event: React.SyntheticEvent) => {
			setActiveDebounced.cancel();
			openNode(event);
		},
		[openNode, setActiveDebounced]
	);

	const displayName = useMemo(() => {
		if (lastEditor && lastEditor.id !== owner?.id) {
			return lastEditor.full_name;
		}
		if (owner && owner.id !== userInfo.me) {
			return owner.full_name;
		}
		return '';
	}, [lastEditor, owner, userInfo.me]);

	const openContextualMenuHandler = useCallback(() => {
		setIsContextualMenuActive(true);
	}, []);

	const closeContextualMenuHandler = useCallback(() => {
		setIsContextualMenuActive(false);
	}, []);

	const preventTextSelection = useCallback<React.MouseEventHandler>((e: React.MouseEvent): void => {
		if (e.detail > 1) {
			e.preventDefault();
		}
	}, []);

	return (
		<Container data-testid={id}>
			<ContextualMenu
				disabled={
					(disabled || isSelectionModeActive || compact) &&
					selectionContextualMenuActionsItems === undefined
				}
				onOpen={openContextualMenuHandler}
				onClose={closeContextualMenuHandler}
				actions={selectionContextualMenuActionsItems || permittedContextualMenuActionsItems}
			>
				<ListItemContainer
					height={'fit'}
					onClick={compact ? setActive : setActiveDebounced}
					onDoubleClick={doubleClickHandler}
					data-testid={`node-item-${id}`}
					crossAlignment={'flex-end'}
					$contextualMenuActive={isContextualMenuActive}
					$disableHover={isContextualMenuActive || dragging || disabled}
					$disabled={disabled}
					onMouseDown={preventTextSelection}
				>
					<HoverContainer
						height={compact ? LIST_ITEM_HEIGHT_COMPACT : LIST_ITEM_HEIGHT}
						wrap="nowrap"
						mainAlignment="flex-start"
						crossAlignment="center"
						padding={{ all: 'small' }}
						width="fill"
						background={isActive ? 'highlight' : 'gray6'}
					>
						<NodeAvatarIcon
							selectionModeActive={isSelectionModeActive}
							selected={isSelected}
							onClick={selectIdCallback}
							compact={compact}
							disabled={disabled}
							selectable={selectable}
							icon={getIconByFileType(type, mimeType || id)}
							picture={getListItemAvatarPictureUrl(id, version, type, mimeType)}
						/>
						<Container
							orientation="vertical"
							crossAlignment="flex-start"
							mainAlignment="space-around"
							padding={{ left: 'large' }}
							minWidth="auto"
							width="fill"
							maxWidth={cssCalcBuilder('100%', ['-', LIST_ITEM_AVATAR_HEIGHT])}
						>
							<Row
								padding={{ vertical: 'extrasmall' }}
								width="fill"
								wrap="nowrap"
								mainAlignment="space-between"
							>
								<Text overflow="ellipsis" disabled={disabled} size="medium">
									{name}
								</Text>
								{!compact && (
									<Container orientation="horizontal" mainAlignment="flex-end" width="fit">
										{flagActive && (
											<Padding left="extrasmall">
												<Icon icon="Flag" color="error" disabled={disabled} />
											</Padding>
										)}
										{linkActive && (
											<Padding left="extrasmall">
												<Icon icon="Link2" disabled={disabled} />
											</Padding>
										)}
										{incomingShare && (
											<Padding left="extrasmall">
												<Icon icon="ArrowCircleLeft" customColor="#AB47BC" disabled={disabled} />
											</Padding>
										)}
										{outgoingShare && (
											<Padding left="extrasmall">
												<Icon icon="ArrowCircleRight" customColor="#FFB74D" disabled={disabled} />
											</Padding>
										)}
										{trashed && isSearchView(location) && (
											<Padding left="extrasmall">
												<Icon icon="Trash2Outline" disabled={disabled} />
											</Padding>
										)}
										<Padding left="extrasmall">
											<Text size="extrasmall" color="gray1" disabled={disabled}>
												{formatDate(updatedAt, undefined, userInfo.zimbraPrefTimeZoneId)}
											</Text>
										</Padding>
									</Container>
								)}
							</Row>
							{!compact && (
								<Row
									padding={{ vertical: 'extrasmall' }}
									width="fill"
									wrap="nowrap"
									mainAlignment="flex-start"
								>
									<Container
										flexShrink={0}
										flexGrow={1}
										flexBasis="auto"
										mainAlignment="flex-start"
										orientation="horizontal"
										width="fit"
									>
										<CustomText color="gray1" disabled={disabled} size="small">
											{/* i18next-extract-disable-next-line */}
											{extension || t(`node.type.${type.toLowerCase()}`, type)}
										</CustomText>
										{size != null && (
											<Padding left="small">
												<CustomText color="gray1" disabled={disabled} size="small">
													{humanFileSize(size)}
												</CustomText>
											</Padding>
										)}
									</Container>
									{displayName && (
										<Container
											width="fit"
											minWidth={0}
											flexShrink={1}
											flexGrow={1}
											flexBasis="auto"
											orientation="horizontal"
											mainAlignment="flex-end"
											padding={{ left: 'small' }}
										>
											<Text size="extrasmall" overflow="ellipsis">
												{displayName}
											</Text>
										</Container>
									)}
								</Row>
							)}
						</Container>
					</HoverContainer>
					{!compact && !isSelectionModeActive && !dragging && (
						<NodeHoverBar actions={permittedHoverBarActionsItems} />
					)}
				</ListItemContainer>
			</ContextualMenu>
		</Container>
	);
};

export const NodeListItem = React.memo(NodeListItemComponent);
