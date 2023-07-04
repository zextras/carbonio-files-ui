/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { ApolloClient, FetchResult, useApolloClient, useReactiveVar } from '@apollo/client';

import { UpdateFolderContentType, useUpdateFolderContent } from './graphql/useUpdateFolderContent';
import { nodeSortVar } from '../apollo/nodeSortVar';
import { DOCS_ENDPOINT, CREATE_FILE_PATH, NODES_LOAD_LIMIT, SHARES_LOAD_LIMIT } from '../constants';
import GET_NODE from '../graphql/queries/getNode.graphql';
import { CreateDocsFile, DocsType } from '../types/common';
import { Folder, GetNodeQuery, GetNodeQueryVariables, NodeSort } from '../types/graphql/types';
import { isFolder, scrollToNodeItem } from '../utils/utils';

interface DocsFile {
	name: string;
	type: DocsType;
	parentId: string;
	nodeId?: string;
}

type UseCreateDocsFile = () => (
	parentFolder: Pick<Folder, '__typename' | 'id' | 'children'>,
	name: string,
	type: DocsType
) => Promise<FetchResult<CreateDocsFile>>;

const createFileCompleted = (
	xhr: XMLHttpRequest,
	file: DocsFile,
	apolloClient: ApolloClient<object>,
	nodeSort: NodeSort,
	addNodeToFolder: UpdateFolderContentType['addNodeToFolder']
): Promise<FetchResult<CreateDocsFile>> => {
	switch (xhr.status) {
		case 200: {
			const response = JSON.parse(xhr.response);
			const { nodeId } = response;

			return apolloClient
				.query<GetNodeQuery, GetNodeQueryVariables>({
					query: GET_NODE,
					variables: {
						node_id: nodeId,
						children_limit: NODES_LOAD_LIMIT,
						shares_limit: SHARES_LOAD_LIMIT,
						sort: nodeSort
					}
				})
				.then((result) => {
					if (result.data.getNode?.parent) {
						if (isFolder(result.data.getNode.parent)) {
							const { isLast } = addNodeToFolder(result.data.getNode.parent, result.data.getNode);
							scrollToNodeItem(result.data.getNode.id, isLast);
						}
					}
					return result;
				})
				.catch((error) => {
					console.error(error);
					throw error;
				});
		}
		case 413: {
			return Promise.reject(new Error(xhr.statusText));
		}
		// name already exists
		case 500: {
			return Promise.reject(new Error(xhr.statusText));
		}
		default: {
			console.error('Unhandled status', xhr.status, xhr.statusText);
			return Promise.reject(new Error(xhr.statusText));
		}
	}
};

export const useCreateDocsFile: UseCreateDocsFile = () => {
	const apolloClient = useApolloClient();

	const nodeSort = useReactiveVar(nodeSortVar);
	const { addNodeToFolder } = useUpdateFolderContent(apolloClient);

	return useCallback(
		(parentFolder: Pick<Folder, '__typename' | 'id' | 'children'>, name: string, type: DocsType) =>
			new Promise<FetchResult<CreateDocsFile>>((resolve, reject) => {
				const file = { name, type, parentId: parentFolder.id };
				const body = {
					filename: file.name,
					type: file.type,
					destinationFolderId: file.parentId
				};
				const xhr = new XMLHttpRequest();
				const url = `${DOCS_ENDPOINT}${CREATE_FILE_PATH}`;
				xhr.open('POST', url, true);
				xhr.setRequestHeader('Content-Type', 'application/json');

				xhr.addEventListener('load', () => {
					if (xhr.readyState === (XMLHttpRequest.DONE || 4)) {
						resolve(createFileCompleted(xhr, file, apolloClient, nodeSort, addNodeToFolder));
					}
				});
				xhr.addEventListener('error', () =>
					reject(createFileCompleted(xhr, file, apolloClient, nodeSort, addNodeToFolder))
				);
				xhr.addEventListener('abort', () =>
					reject(createFileCompleted(xhr, file, apolloClient, nodeSort, addNodeToFolder))
				);
				xhr.send(JSON.stringify(body));
			}),
		[apolloClient, nodeSort, addNodeToFolder]
	);
};
