/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback } from 'react';

import {
	OpenNodesSelectionModal,
	useNodesSelectionModal
} from '../carbonio-files-ui-common/hooks/modals/useNodesSelectionModal';
import { isFile, isFolder } from '../carbonio-files-ui-common/utils/utils';
import { NodeForSelection } from '../carbonio-files-ui-common/views/components/NodesSelectionModalContent';

export type OpenSelectNodesModalArgs = Parameters<OpenNodesSelectionModal>[number] & {
	allowFolders?: boolean;
	allowFiles?: boolean;
	actionLabel?: string;
	actionIcon?: string;
};

export const useSelectNodes = (): ((args: OpenSelectNodesModalArgs) => void) => {
	const { openNodesSelectionModal } = useNodesSelectionModal();

	return useCallback(
		({
			allowFiles = true,
			allowFolders = true,
			isValidSelection,
			...rest
		}: OpenSelectNodesModalArgs): void => {
			const checkIfNodeIsSelectable = (node: NodeForSelection): boolean =>
				(((allowFolders && isFolder(node)) || (allowFiles && isFile(node))) &&
					(isValidSelection === undefined || isValidSelection(node))) ||
				false;

			openNodesSelectionModal({ ...rest, isValidSelection: checkIfNodeIsSelectable });
		},
		[openNodesSelectionModal]
	);
};
