/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useEffect, useMemo } from 'react';

import { AnyFunction, registerActions, registerFunctions } from '@zextras/carbonio-shell-ui';

import { useUpdateLinkMutation } from '../carbonio-files-ui-common/hooks/graphql/mutations/useUpdateLinkMutation';
import { FUNCTION_IDS } from '../constants';
import { getGetLinkFunction } from './getGetLinkFunction';
import { getNodeFunction } from './getNodeFunction';
import { getUploadToTargetAndGetTargetIdFunction } from './getUploadToTargetAndGetTargetIdFunction';
import { useSelectNodes } from './useSelectNodes';
import { useSelectNodesAction } from './useSelectNodesAction';

export const useIntegrations = (): void => {
	const selectNodesAction = useSelectNodesAction();
	const selectNodes = useSelectNodes();
	const updateLink = useUpdateLinkMutation();

	const updateLinkFunction = useMemo(
		() => ({
			id: FUNCTION_IDS.UPDATE_LINK,
			fn: updateLink as AnyFunction
		}),
		[updateLink]
	);

	const selectNodesFunction = useMemo(
		() => ({
			id: FUNCTION_IDS.SELECT_NODES,
			fn: selectNodes as AnyFunction
		}),
		[selectNodes]
	);

	useEffect(() => {
		// TODO: remove when all modules will be using new function integration
		registerActions(selectNodesAction);
	}, [selectNodesAction]);

	useEffect(() => {
		registerFunctions(
			getUploadToTargetAndGetTargetIdFunction(),
			getGetLinkFunction(),
			getNodeFunction(),
			selectNodesFunction,
			updateLinkFunction
		);
	}, [selectNodesFunction, updateLinkFunction]);
};
