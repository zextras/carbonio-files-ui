/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useEffect, useMemo } from 'react';

import { AnyFunction, registerFunctions } from '@zextras/carbonio-shell-ui';

import { getGetLinkFunction } from './getGetLinkFunction';
import { getNodeFunction } from './getNodeFunction';
import { getUploadToTargetAndGetTargetIdFunction } from './getUploadToTargetAndGetTargetIdFunction';
import { useSelectNodes } from './useSelectNodes';
import { useUpdateLinkMutation } from '../carbonio-files-ui-common/hooks/graphql/mutations/useUpdateLinkMutation';
import { ErrorHandlerOptions } from '../carbonio-files-ui-common/hooks/useErrorHandler';
import { FUNCTION_IDS } from '../constants';

export const useIntegrations = (): void => {
	const selectNodes = useSelectNodes();
	const errorHandlerOptions: ErrorHandlerOptions = useMemo(
		() => ({
			showSnackbar: false
		}),
		[]
	);
	const updateLink = useUpdateLinkMutation(errorHandlerOptions);

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
		registerFunctions(
			getUploadToTargetAndGetTargetIdFunction(),
			getGetLinkFunction(),
			getNodeFunction(),
			selectNodesFunction,
			updateLinkFunction
		);
	}, [selectNodesFunction, updateLinkFunction]);
};
