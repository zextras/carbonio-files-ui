/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback } from 'react';

import { AnyFunction } from '@zextras/carbonio-shell-ui';

import {
	OpenNodesSelectionModal,
	useNodesSelectionModal
} from '../carbonio-files-ui-common/hooks/modals/useNodesSelectionModal';
import { RootListItemType } from '../carbonio-files-ui-common/types/common';
import { BaseNodeFragment } from '../carbonio-files-ui-common/types/graphql/types';
import { isFile, isFolder } from '../carbonio-files-ui-common/utils/ActionsFactory';

export type OpenSelectNodesModalArgs = Parameters<OpenNodesSelectionModal>[number] & {
	allowFolders?: boolean;
	allowFiles?: boolean;
	actionLabel?: string;
	actionIcon?: string;
};

export const useSelectNodes = (): AnyFunction => {
	const { openNodesSelectionModal } = useNodesSelectionModal();

	const openSelectNodesModal = useCallback(
		({
			allowFiles = true,
			allowFolders = true,
			isValidSelection,
			...rest
		}: OpenSelectNodesModalArgs): void => {
			const checkIfNodeIsSelectable = (node: BaseNodeFragment | RootListItemType): boolean =>
				(((allowFolders && isFolder(node)) || (allowFiles && isFile(node))) &&
					(isValidSelection === undefined || isValidSelection(node))) ||
				false;

			openNodesSelectionModal({ ...rest, isValidSelection: checkIfNodeIsSelectable });
		},
		[openNodesSelectionModal]
	);

	return openSelectNodesModal as AnyFunction;
};
