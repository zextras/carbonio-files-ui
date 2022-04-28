/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback } from 'react';

import { Action, ActionFactory, registerActions } from '@zextras/carbonio-shell-ui';

import { useNodesSelectionModal } from '../carbonio-files-ui-common/hooks/modals/useNodesSelectionModal';
import { RootListItemType } from '../carbonio-files-ui-common/types/common';
import { BaseNodeFragment } from '../carbonio-files-ui-common/types/graphql/types';
import { isFile, isFolder } from '../carbonio-files-ui-common/utils/ActionsFactory';
import { ACTION_IDS, ACTION_TYPES } from '../constants';

type ActionTarget = Parameters<
	ReturnType<typeof useNodesSelectionModal>['openNodesSelectionModal']
>[number] & {
	allowFolders?: boolean;
	allowFiles?: boolean;
	actionLabel?: string;
	actionIcon?: string;
};

export const useSelectNodes = (): Parameters<typeof registerActions>[number] => {
	const { openNodesSelectionModal } = useNodesSelectionModal();

	const selectSelectNodesAction = useCallback<ActionFactory<ActionTarget>>(
		({
			allowFiles = true,
			allowFolders = true,
			isValidSelection,
			actionLabel = 'Select nodes from Files',
			actionIcon = 'DriveOutline',
			...rest
		}): Action => {
			const checkIfNodeIsSelectable = (node: BaseNodeFragment | RootListItemType): boolean =>
				(((allowFolders && isFolder(node)) || (allowFiles && isFile(node))) &&
					(!isValidSelection || isValidSelection(node))) ||
				false;

			return {
				id: ACTION_IDS.SELECT_NODES,
				label: actionLabel,
				icon: actionIcon,
				click: (): void =>
					openNodesSelectionModal({ ...rest, isValidSelection: checkIfNodeIsSelectable }),
				type: ACTION_TYPES.FILES_ACTION
			};
		},
		[openNodesSelectionModal]
	);

	return {
		id: ACTION_IDS.SELECT_NODES,
		action: selectSelectNodesAction as ActionFactory<unknown>,
		type: ACTION_TYPES.FILES_ACTION
	};
};
