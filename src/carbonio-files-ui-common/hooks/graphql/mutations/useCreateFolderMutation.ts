/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable arrow-body-style */
import { useCallback } from 'react';

import { FetchResult, MutationHookOptions, MutationResult, useMutation } from '@apollo/client';

import CREATE_FOLDER from '../../../graphql/mutations/createFolder.graphql';
import {
	CreateFolderMutation,
	CreateFolderMutationVariables,
	Folder
} from '../../../types/graphql/types';
import { scrollToNodeItem } from '../../../utils/utils';
import { useErrorHandler } from '../../useErrorHandler';
import { useUpdateFolderContent } from '../useUpdateFolderContent';

export type CreateFolderType = (
	parentFolder: Pick<Folder, 'id'>,
	name: string
) => Promise<FetchResult<CreateFolderMutation>>;

interface CreateFolderMutationOptions
	extends MutationHookOptions<CreateFolderMutation, CreateFolderMutationVariables> {
	showSnackbar?: boolean;
}

/**
 * Can return error: ErrorCode.FILE_VERSION_NOT_FOUND, ErrorCode.NODE_NOT_FOUND
 */
export function useCreateFolderMutation(
	{ showSnackbar = true, ...mutationOptions }: CreateFolderMutationOptions = { showSnackbar: true }
): {
	createFolder: CreateFolderType;
} & Pick<MutationResult<CreateFolderMutation>, 'error' | 'loading' | 'reset'> {
	const [createFolderMutation, { error: createFolderError, loading, reset }] = useMutation<
		CreateFolderMutation,
		CreateFolderMutationVariables
	>(CREATE_FOLDER, mutationOptions);
	const { addNodeToFolder } = useUpdateFolderContent(mutationOptions.client);

	const createFolder = useCallback<CreateFolderType>(
		(parentFolder: Parameters<CreateFolderType>[0], name: string) => {
			return createFolderMutation({
				variables: {
					destination_id: parentFolder.id,
					name
				},
				// after the mutation returns a response, check if next neighbor is already loaded.
				// If so, write the folder in cache,
				// otherwise this new folder will be loaded with next fetchMore calls
				update(cache, { data }) {
					if (data?.createFolder) {
						const { isLast } = addNodeToFolder(parentFolder, data.createFolder);
						scrollToNodeItem(data.createFolder.id, isLast);
					}
				}
			});
		},
		[createFolderMutation, addNodeToFolder]
	);

	useErrorHandler(createFolderError, 'CREATE_FOLDER', { showSnackbar });

	return { createFolder, error: createFolderError, loading, reset };
}
