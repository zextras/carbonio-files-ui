/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useContext, useMemo } from 'react';

import { Action as DSAction, CollapsingActions, Container } from '@zextras/carbonio-design-system';
import { PreviewsManagerContext } from '@zextras/carbonio-ui-preview';
import { includes } from 'lodash';
import { useTranslation } from 'react-i18next';

import { useActiveNode } from '../../../hooks/useActiveNode';
import { useSendViaMail } from '../../../hooks/useSendViaMail';
import { DISPLAYER_TABS } from '../../constants';
import { useDeleteNodesMutation } from '../../hooks/graphql/mutations/useDeleteNodesMutation';
import { useFlagNodesMutation } from '../../hooks/graphql/mutations/useFlagNodesMutation';
import { useRestoreNodesMutation } from '../../hooks/graphql/mutations/useRestoreNodesMutation';
import { useTrashNodesMutation } from '../../hooks/graphql/mutations/useTrashNodesMutation';
import { useCopyModal } from '../../hooks/modals/useCopyModal';
import { useDeletePermanentlyModal } from '../../hooks/modals/useDeletePermanentlyModal';
import { useMoveModal } from '../../hooks/modals/useMoveModal';
import { useRenameModal } from '../../hooks/modals/useRenameModal';
import { useHealthInfo } from '../../hooks/useHealthInfo';
import { Node } from '../../types/common';
import { DeepPick } from '../../types/utils';
import { Action, buildActionItems, getAllPermittedActions } from '../../utils/ActionsFactory';
import { downloadNode, openNodeWithDocs } from '../../utils/utils';

type NodeItem = Node<
	'id' | 'name' | 'rootId' | 'permissions' | 'type' | 'flagged',
	'version' | 'mime_type'
> &
	DeepPick<Node<'parent'>, 'parent', 'id' | 'permissions' | '__typename'> &
	DeepPick<Node<'owner'>, 'owner', 'id'>;
interface DisplayerActionsParams {
	node: NodeItem;
}

export const DisplayerActions = ({ node }: DisplayerActionsParams): React.JSX.Element => {
	const [t] = useTranslation();

	/** Mutation to update the flag status */
	const toggleFlag = useFlagNodesMutation();

	/** Mutation to mark nodes for deletion */
	const markNodesForDeletion = useTrashNodesMutation();

	const markNodesForDeletionCallback = useCallback(() => {
		markNodesForDeletion(node);
	}, [node, markNodesForDeletion]);

	/** Mutation to delete permanently nodes */
	const deletePermanently = useDeleteNodesMutation();

	const deletePermanentlyCallback = useCallback(
		() => deletePermanently(node),
		[node, deletePermanently]
	);

	/** Mutation to restore nodes */
	const restore = useRestoreNodesMutation();

	const restoreNodeCallback = useCallback(() => {
		restore(node);
	}, [node, restore]);

	const { openDeletePermanentlyModal } = useDeletePermanentlyModal(deletePermanentlyCallback);

	const { canUsePreview, canUseDocs } = useHealthInfo();

	const permittedDisplayerActions: Action[] = useMemo(
		() => getAllPermittedActions({ nodes: [node], canUsePreview, canUseDocs }),
		[canUseDocs, canUsePreview, node]
	);

	const { openMoveNodesModal } = useMoveModal();

	const { openCopyNodesModal } = useCopyModal();

	const { openRenameModal } = useRenameModal();

	const { sendViaMail } = useSendViaMail();

	const sendViaMailCallback = useCallback(() => {
		sendViaMail(node.id);
	}, [node, sendViaMail]);

	const { setActiveNode } = useActiveNode();

	const manageShares = useCallback(() => {
		setActiveNode(node.id, DISPLAYER_TABS.sharing);
	}, [node.id, setActiveNode]);

	const { openPreview } = useContext(PreviewsManagerContext);

	const preview = useCallback(() => {
		if (includes(permittedDisplayerActions, Action.Preview)) {
			openPreview(node.id);
		} else if (includes(permittedDisplayerActions, Action.OpenWithDocs)) {
			// if preview is not supported and document can be opened with docs, open editor
			openNodeWithDocs(node.id);
		}
	}, [node.id, permittedDisplayerActions, openPreview]);

	const itemsMap = useMemo<Partial<Record<Action, DSAction>>>(
		() => ({
			[Action.Edit]: {
				id: 'Edit',
				icon: 'Edit2Outline',
				label: t('actions.edit', 'Edit'),
				onClick: (): void => {
					openNodeWithDocs(node.id);
				}
			},
			[Action.Preview]: {
				id: 'Preview',
				icon: 'MaximizeOutline',
				label: t('actions.preview', 'Preview'),
				onClick: preview
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
					// download node without version to be sure last version is downlaoded
					downloadNode(node.id);
				}
			},
			[Action.ManageShares]: {
				id: 'ManageShares',
				icon: 'ShareOutline',
				label: t('actions.manageShares', 'Manage shares'),
				onClick: manageShares
			},
			[Action.Flag]: {
				id: 'Flag',
				icon: 'FlagOutline',
				label: t('actions.flag', 'Flag'),
				onClick: (): void => {
					toggleFlag(true, node);
				}
			},
			[Action.UnFlag]: {
				id: 'UnFlag',
				icon: 'UnflagOutline',
				label: t('actions.unflag', 'Unflag'),
				onClick: (): void => {
					toggleFlag(false, node);
				}
			},
			[Action.OpenWithDocs]: {
				id: 'OpenWithDocs',
				icon: 'BookOpenOutline',
				label: t('actions.openWithDocs', 'Open document'),
				onClick: (): void => {
					openNodeWithDocs(node.id);
				}
			},
			[Action.Copy]: {
				id: 'Copy',
				icon: 'Copy',
				label: t('actions.copy', 'Copy'),
				onClick: (): void => {
					openCopyNodesModal([node], node.parent?.id);
				}
			},
			[Action.Move]: {
				id: 'Move',
				icon: 'MoveOutline',
				label: t('actions.move', 'Move'),
				onClick: (): void => {
					openMoveNodesModal([node], node.parent?.id);
				}
			},
			[Action.Rename]: {
				id: 'Rename',
				icon: 'Edit2Outline',
				label: t('actions.rename', 'Rename'),
				onClick: (): void => {
					openRenameModal(node);
				}
			},
			[Action.MoveToTrash]: {
				id: 'MarkForDeletion',
				icon: 'Trash2Outline',
				label: t('actions.moveToTrash', 'Move to Trash'),
				onClick: markNodesForDeletionCallback
			},
			[Action.Restore]: {
				id: 'Restore',
				icon: 'RestoreOutline',
				label: t('actions.restore', 'Restore'),
				onClick: restoreNodeCallback
			},
			[Action.DeletePermanently]: {
				id: 'DeletePermanently',
				icon: 'DeletePermanentlyOutline',
				label: t('actions.deletePermanently', 'Delete permanently'),
				onClick: openDeletePermanentlyModal
			}
		}),
		[
			manageShares,
			markNodesForDeletionCallback,
			node,
			openCopyNodesModal,
			openDeletePermanentlyModal,
			openMoveNodesModal,
			openRenameModal,
			preview,
			restoreNodeCallback,
			sendViaMailCallback,
			t,
			toggleFlag
		]
	);

	const permittedDisplayerActionsItems = useMemo<DSAction[]>(
		() => buildActionItems(itemsMap, permittedDisplayerActions),
		[itemsMap, permittedDisplayerActions]
	);

	return (
		<Container
			orientation="horizontal"
			mainAlignment="flex-end"
			crossAlignment="center"
			height="auto"
			padding={{ horizontal: 'large', vertical: 'small' }}
			data-testid="displayer-actions-header"
		>
			<CollapsingActions
				actions={permittedDisplayerActionsItems}
				size={'medium'}
				color={'text'}
				maxVisible={3}
				gap={'0.25rem'}
			/>
		</Container>
	);
};
