/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { ObservableQuery, OperationVariables } from '@apollo/client';
import { MutationBaseOptions } from '@apollo/client/core/watchQueryOptions';
import { DocumentNode } from 'graphql';
import { some } from 'lodash';

import FIND_NODES from '../../graphql/queries/findNodes.graphql';
import GET_CHILDREN from '../../graphql/queries/getChildren.graphql';
import { FindNodesQuery, GetChildrenQuery, Node } from '../../types/graphql/types';
import { isFolder } from '../../utils/utils';

export function isOperationVariables<TVariables extends OperationVariables>(
	query: ObservableQuery['options']['query'],
	variables: OperationVariables | undefined,
	documentNode: DocumentNode
): variables is TVariables {
	return query === documentNode;
}

export function isQueryResult<TData extends OperationVariables>(
	query: ObservableQuery['options']['query'],
	result: unknown,
	documentNode: DocumentNode
): result is TData {
	return query === documentNode;
}

export function createOnQueryUpdated(
	activeNodeId: string | undefined,
	removeActiveNode: () => void
): MutationBaseOptions['onQueryUpdated'] {
	return function onQueryUpdated(observableQuery, { missing, result }) {
		const { query } = observableQuery.options;
		let listNodes = null;
		if (isQueryResult<FindNodesQuery>(query, result, FIND_NODES)) {
			if (missing) {
				return observableQuery.refetch();
			}
			listNodes = result.findNodes?.nodes;
		}
		if (
			isQueryResult<GetChildrenQuery>(query, result, GET_CHILDREN) &&
			result.getNode &&
			isFolder(result.getNode)
		) {
			listNodes = result.getNode.children?.nodes;
		}

		if (
			observableQuery.hasObservers() &&
			activeNodeId &&
			listNodes &&
			!some<Pick<Node, 'id'> | null>(listNodes, (resultNode) => resultNode?.id === activeNodeId)
		) {
			removeActiveNode();
		}
		return observableQuery.reobserve();
	};
}
