/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { FetchResult, useApolloClient, useReactiveVar } from '@apollo/client';
import { useSnackbar } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';

import { useUpdateFolderContent } from './graphql/useUpdateFolderContent';
import { nodeSortVar } from '../apollo/nodeSortVar';
import {
	DOCS_ENDPOINT,
	CREATE_FILE_PATH,
	NODES_LOAD_LIMIT,
	SHARES_LOAD_LIMIT,
	HTTP_STATUS_CODE
} from '../constants';
import { CreateDocsFile, DocsType } from '../types/common';
import {
	Folder,
	GetNodeDocument,
	GetNodeQuery,
	GetNodeQueryVariables
} from '../types/graphql/types';
import { getDocumentGenericType, isFolder, scrollToNodeItem } from '../utils/utils';

type UseCreateDocsFileReturnType = (
	parentFolder: Pick<Folder, '__typename' | 'id' | 'children'>,
	name: string,
	type: DocsType
) => Promise<FetchResult<CreateDocsFile> | undefined>;

export interface CreateDocsFileResponse {
	nodeId: string | null;
}

export interface CreateDocsFileRequestBody {
	filename: string;
	destinationFolderId: string;
	type: DocsType;
}

export const useCreateDocsFile = (): UseCreateDocsFileReturnType => {
	const apolloClient = useApolloClient();
	const nodeSort = useReactiveVar(nodeSortVar);
	const { addNodeToFolder } = useUpdateFolderContent();
	const createSnackbar = useSnackbar();
	const [t] = useTranslation();

	const onCreateFileCompleted = useCallback(
		(nodeId: string) =>
			apolloClient
				.query<GetNodeQuery, GetNodeQueryVariables>({
					query: GetNodeDocument,
					variables: {
						node_id: nodeId,
						children_limit: NODES_LOAD_LIMIT,
						shares_limit: SHARES_LOAD_LIMIT,
						sort: nodeSort
					}
				})
				.then((result) => {
					if (result.data.getNode?.parent && isFolder(result.data.getNode.parent)) {
						const { isLast } = addNodeToFolder(result.data.getNode.parent, result.data.getNode);
						scrollToNodeItem(result.data.getNode.id, isLast);
					}
					return result;
				})
				.catch((error) => {
					console.error(error);
					throw error;
				}),
		[addNodeToFolder, apolloClient, nodeSort]
	);

	return useCallback<UseCreateDocsFileReturnType>(
		async (
			parentFolder: Pick<Folder, '__typename' | 'id' | 'children'>,
			name: string,
			type: DocsType
		) => {
			const url = `${DOCS_ENDPOINT}${CREATE_FILE_PATH}`;
			const file = { name, type, parentId: parentFolder.id };
			const response = await fetch(url, {
				method: 'POST',
				body: JSON.stringify({
					filename: file.name,
					type: file.type,
					destinationFolderId: file.parentId
				} satisfies CreateDocsFileRequestBody)
			});
			if (response.ok) {
				const { nodeId } = (await response.json()) as CreateDocsFileResponse;
				if (nodeId) {
					return onCreateFileCompleted(nodeId);
				}
				return undefined;
			}
			if (response.status === HTTP_STATUS_CODE.overQuota) {
				const documentGenericType = getDocumentGenericType(type);
				createSnackbar({
					severity: 'error',
					disableAutoHide: true,
					key: 'create-docs-over-quota',
					label: t(`snackbar.createDocument.error.overQuota.${documentGenericType}`, {
						defaultValue: `New ${documentGenericType} creation failed. You have reached your storage limit. Delete some items to free up storage space and try again.`
					}),
					actionLabel: t('snackbar.createDocument.error.overQuota.actionLabel', 'Ok')
				});
				return undefined;
			}
			throw new Error(response.statusText);
		},
		[createSnackbar, t, onCreateFileCompleted]
	);
};
