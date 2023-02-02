/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useMemo } from 'react';

import { Action as DSAction } from '@zextras/carbonio-design-system';
import { map } from 'lodash';
import { useTranslation } from 'react-i18next';

import { useNavigation } from '../../hooks/useNavigation';
import { Action } from '../types/common';
import { UploadItem } from '../types/graphql/client-types';
import { MakeRequired } from '../types/utils';
import {
	ActionsFactoryCheckerMap,
	buildActionItems,
	getPermittedUploadActions
} from '../utils/ActionsFactory';
import { scrollToNodeItem } from '../utils/utils';
import { useUpload } from './useUpload';

type ActionNodes = MakeRequired<Partial<UploadItem>, 'id'>[];

export function useUploadActions(
	nodes: ActionNodes,
	actionCheckers: ActionsFactoryCheckerMap | undefined = {},
	actionCallbacks: Partial<Record<Action, (nodesInvolved: ActionNodes) => void>> | undefined = {}
): DSAction[] {
	const [t] = useTranslation();
	const { removeById, retryById } = useUpload();
	const node = nodes.length > 0 ? nodes[0] : undefined;

	const nodeIds = useMemo(() => map(nodes, (item) => item.id), [nodes]);

	const callActionCallback = useCallback(
		(action: Action, nodesInvolved: ActionNodes) => {
			const actionCallback = actionCallbacks[action];
			if (actionCallback) {
				actionCallback(nodesInvolved);
			}
		},
		[actionCallbacks]
	);

	const removeUpload = useCallback(() => {
		removeById(nodeIds);
		callActionCallback(Action.RemoveUpload, nodes);
	}, [removeById, nodeIds, callActionCallback, nodes]);

	const retryUpload = useCallback(() => {
		retryById(nodeIds);
		callActionCallback(Action.RetryUpload, nodes);
	}, [callActionCallback, nodeIds, nodes, retryById]);

	const { navigateToFolder, navigateTo } = useNavigation();

	const goToFolderSelection = useCallback(() => {
		if (node?.parentNodeId) {
			if (nodes.length === 1) {
				if (node.nodeId) {
					const destination = `/?folder=${node.parentNodeId}&node=${node.nodeId}`;
					navigateTo(destination);
					scrollToNodeItem(node.nodeId);
				} else {
					navigateToFolder(node.parentNodeId);
				}
			} else {
				navigateToFolder(node.parentNodeId);
			}
			callActionCallback(Action.GoToFolder, [node]);
		}
	}, [callActionCallback, navigateTo, navigateToFolder, node, nodes.length]);

	const permittedUploadActions = useMemo(
		() => getPermittedUploadActions(nodes, actionCheckers),
		[actionCheckers, nodes]
	);

	const items = useMemo<Partial<Record<Action, DSAction>>>(
		() => ({
			[Action.RemoveUpload]: {
				id: 'removeUpload',
				icon: 'CloseCircleOutline',
				label: t('actions.removeUpload', 'Remove upload'),
				onClick: removeUpload
			},
			[Action.RetryUpload]: {
				id: 'RetryUpload',
				icon: 'PlayCircleOutline',
				label: t('actions.retryUpload', 'Retry upload'),
				onClick: retryUpload
			},
			[Action.GoToFolder]: {
				id: 'GoToFolder ',
				icon: 'FolderOutline',
				label: t('actions.goToFolder', 'Go to destination folder'),
				onClick: goToFolderSelection
			}
		}),
		[removeUpload, goToFolderSelection, retryUpload, t]
	);

	return useMemo(
		() => buildActionItems(items, permittedUploadActions),
		[items, permittedUploadActions]
	);
}
