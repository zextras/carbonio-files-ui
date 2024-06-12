/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback, useMemo } from 'react';

import { QueryResult, useQuery, useReactiveVar } from '@apollo/client';
import { isEqual } from 'lodash';

import { nodeSortVar } from '../../../apollo/nodeSortVar';
import { NODES_LOAD_LIMIT, SHARES_LOAD_LIMIT } from '../../../constants';
import {
	GetChildrenDocument,
	GetChildrenQuery,
	GetChildrenQueryVariables
} from '../../../types/graphql/types';
import { isFolder } from '../../../utils/utils';
import { useErrorHandler } from '../../useErrorHandler';
import { useMemoCompare } from '../../useMemoCompare';

interface GetChildrenQueryHookReturnType
	extends QueryResult<GetChildrenQuery, GetChildrenQueryVariables> {
	hasMore: boolean;
	pageToken: string | null | undefined;
	loadMore: () => void;
}

/**
 * Can return error: ErrorCode.FILE_VERSION_NOT_FOUND, ErrorCode.NODE_NOT_FOUND
 */
export function useGetChildrenQuery(parentNode: string): GetChildrenQueryHookReturnType {
	const nodeSort = useReactiveVar(nodeSortVar);

	const { data, fetchMore, ...queryResult } = useQuery(GetChildrenDocument, {
		variables: {
			node_id: parentNode,
			children_limit: NODES_LOAD_LIMIT,
			sort: nodeSort,
			shares_limit: SHARES_LOAD_LIMIT
		},
		skip: !parentNode,
		errorPolicy: 'all',
		returnPartialData: true
	});

	const error = useMemoCompare(queryResult.error, (prev, next) => isEqual(prev, next));

	useErrorHandler(error, 'GET_CHILDREN');

	const { hasMore, pageToken } = useMemo(
		() => ({
			hasMore:
				!!data?.getNode &&
				isFolder(data.getNode) &&
				data.getNode.children &&
				data.getNode.children.page_token !== null,
			pageToken:
				data?.getNode && isFolder(data.getNode) && data.getNode.children
					? data.getNode.children.page_token
					: undefined
		}),
		[data?.getNode]
	);

	const loadMore = useCallback(() => {
		fetchMore<GetChildrenQuery, GetChildrenQueryVariables>({
			variables: {
				page_token: pageToken
			}
		}).catch((err) => {
			console.error(err);
			return err;
		});
	}, [fetchMore, pageToken]);

	return { ...queryResult, fetchMore, data, hasMore, pageToken, loadMore };
}
