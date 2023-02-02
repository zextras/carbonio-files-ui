/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { ApolloError, FetchResult, useMutation } from '@apollo/client';

import UPDATE_NODE_DESCRIPTION from '../../../graphql/mutations/updateNodeDescription.graphql';
import { UpdateNodeMutation, UpdateNodeMutationVariables } from '../../../types/graphql/types';
import { useErrorHandler } from '../../useErrorHandler';

export type UpdateNodeDescriptionType = (
	id: string,
	description: string
) => Promise<FetchResult<UpdateNodeMutation>>;

export type UseUpdateNodeDescriptionMutationHook = () => {
	updateNodeDescription: UpdateNodeDescriptionType;
	updateNodeDescriptionError: ApolloError | undefined;
};

/**
 * Can return error: ErrorCode.FILE_VERSION_NOT_FOUND, ErrorCode.NODE_NOT_FOUND
 */
export const useUpdateNodeDescriptionMutation: UseUpdateNodeDescriptionMutationHook = () => {
	const [updateNodeMutation, { error: updateNodeDescriptionError }] = useMutation<
		UpdateNodeMutation,
		UpdateNodeMutationVariables
	>(UPDATE_NODE_DESCRIPTION);

	const updateNodeDescription: UpdateNodeDescriptionType = useCallback(
		(id: string, description: string) =>
			updateNodeMutation({
				variables: {
					node_id: id,
					description
				}
			}),
		[updateNodeMutation]
	);
	useErrorHandler(updateNodeDescriptionError, 'UPDATE_NODE_DESCRIPTION');

	return { updateNodeDescription, updateNodeDescriptionError };
};
