/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback, useMemo } from 'react';

import { ApolloClient, FetchResult, NormalizedCacheObject, useReactiveVar } from '@apollo/client';

import buildClient from '../apollo';
import { nodeSortVar } from '../apollo/nodeSortVar';
import { DOCS_ENDPOINT, CREATE_FILE_PATH, NODES_LOAD_LIMIT, SHARES_LOAD_LIMIT } from '../constants';
import GET_CHILDREN from '../graphql/queries/getChildren.graphql';
import GET_NODE from '../graphql/queries/getNode.graphql';
import { CreateDocsFile, DocsType } from '../types/common';
import {
	Folder,
	GetChildrenQuery,
	GetChildrenQueryVariables,
	GetNodeQuery,
	GetNodeQueryVariables,
	NodeSort
} from '../types/graphql/types';
import { scrollToNodeItem } from '../utils/utils';
import { UpdateFolderContentType, useUpdateFolderContent } from './graphql/useUpdateFolderContent';

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
	apolloClient: ApolloClient<NormalizedCacheObject>,
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
						const parentFolder = apolloClient.cache.readQuery<
							GetChildrenQuery,
							GetChildrenQueryVariables
						>({
							query: GET_CHILDREN,
							variables: {
								node_id: result.data.getNode.parent.id,
								// load all cached children
								children_limit: Number.MAX_SAFE_INTEGER,
								sort: nodeSort
							}
						});
						if (parentFolder?.getNode?.__typename === 'Folder') {
							const parentNode = parentFolder.getNode;
							const { isLast } = addNodeToFolder(parentNode, result.data.getNode);
							scrollToNodeItem(result.data.getNode.id, isLast);
						}
					}
					return result;
				});
		}
		case 413: {
			// eslint-disable-next-line prefer-promise-reject-errors
			return Promise.reject({ message: xhr.statusText });
		}
		// name already exists
		case 500: {
			// eslint-disable-next-line prefer-promise-reject-errors
			return Promise.reject({ message: xhr.statusText });
		}
		default: {
			console.error('Unhandled status', xhr.status, xhr.statusText);
			// eslint-disable-next-line prefer-promise-reject-errors
			return Promise.reject({ message: xhr.statusText });
		}
	}
};

export const useCreateDocsFile: UseCreateDocsFile = () => {
	// TODO use useApolloClient when apollo provider will be moved up in tha app
	// const apolloClient = useApolloClient();
	const apolloClient = useMemo(() => buildClient(), []);

	const nodeSort = useReactiveVar(nodeSortVar);
	const { addNodeToFolder } = useUpdateFolderContent(apolloClient);

	const createDocsFile = useCallback(
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

	return createDocsFile;
};
