/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { AnyFunction, registerFunctions } from '@zextras/carbonio-shell-ui';

import buildClient from '../carbonio-files-ui-common/apollo';
import GET_BASE_NODE from '../carbonio-files-ui-common/graphql/queries/getBaseNode.graphql';
import { NodeWithMetadata } from '../carbonio-files-ui-common/types/common';
import {
	GetBaseNodeQuery,
	GetBaseNodeQueryVariables,
	GetNodeQueryVariables
} from '../carbonio-files-ui-common/types/graphql/types';
import { FUNCTION_IDS } from '../constants';
import { buildInternalLink } from '../hooks/useInternalLink';

type GetNodeFunctionArgs = [GetNodeQueryVariables['node_id']];
type GetNodeFunctionReturnType = NodeWithMetadata & { internal_link: string };

function getNodeWithClient(
	apolloClient: ApolloClient<NormalizedCacheObject>
): (...args: GetNodeFunctionArgs) => Promise<GetNodeFunctionReturnType> {
	return (...args) =>
		new Promise<GetNodeFunctionReturnType>((resolve, reject) => {
			apolloClient
				.query<GetBaseNodeQuery, GetBaseNodeQueryVariables>({
					query: GET_BASE_NODE,
					variables: {
						node_id: args[0]
					},
					fetchPolicy: 'network-only'
				})
				.then((result) => {
					if (result?.data?.getNode) {
						const nodeWithMetadata = {
							...result.data.getNode,
							internal_link: buildInternalLink(result.data.getNode.id, result.data.getNode.type)
						};
						resolve(nodeWithMetadata);
					} else {
						reject();
					}
				})
				.catch((error) => {
					reject(error);
				});
		});
}

export const getNodeFunction = (): Parameters<typeof registerFunctions>[number] => {
	const apolloClient = buildClient();

	return {
		id: FUNCTION_IDS.GET_NODE,
		fn: getNodeWithClient(apolloClient) as AnyFunction
	};
};
