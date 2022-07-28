/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback } from 'react';

import { Action, ActionFactory, registerActions } from '@zextras/carbonio-shell-ui';

import { ACTION_IDS, ACTION_TYPES } from '../constants';
import { OpenSelectNodesModalArgs, useSelectNodes } from './useSelectNodes';

type ActionTarget = OpenSelectNodesModalArgs & {
	actionLabel?: string;
	actionIcon?: string;
};

export const useSelectNodesAction = (): Parameters<typeof registerActions>[number] => {
	const openSelectNodesModalFunction = useSelectNodes();

	const selectSelectNodesAction = useCallback<ActionFactory<ActionTarget>>(
		({
			actionLabel = 'Select nodes from Files',
			actionIcon = 'DriveOutline',
			...rest
		}): Action => ({
			id: ACTION_IDS.SELECT_NODES,
			label: actionLabel,
			icon: actionIcon,
			click: (): unknown => openSelectNodesModalFunction({ ...rest }),
			type: ACTION_TYPES.FILES_ACTION
		}),
		[openSelectNodesModalFunction]
	);

	return {
		id: ACTION_IDS.SELECT_NODES,
		action: selectSelectNodesAction as ActionFactory<unknown>,
		type: ACTION_TYPES.FILES_ACTION
	};
};
