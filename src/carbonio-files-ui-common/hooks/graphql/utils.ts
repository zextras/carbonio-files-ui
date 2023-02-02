/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { ObservableQuery, OperationVariables } from '@apollo/client';
import { DocumentNode } from 'graphql';

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
