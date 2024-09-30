/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { registerFunctions } from '@zextras/carbonio-shell-ui';

import buildClient from '../carbonio-files-ui-common/apollo';
import { Node } from '../carbonio-files-ui-common/types/common';
import {
	GetBaseNodeDocument,
	GetNodeQueryVariables
} from '../carbonio-files-ui-common/types/graphql/types';
import { FUNCTION_IDS } from '../constants';
import { buildInternalLink } from '../hooks/useInternalLink';

type GetNodeFunctionArgs = [GetNodeQueryVariables['node_id']];
type GetNodeFunctionReturnType = Node<
	'id' | 'name' | 'type' | 'flagged' | 'rootId' | 'permissions',
	'version' | 'extension' | 'size' | 'mime_type'
> & { internal_link: string | null };

function getNodeWithClient(
	apolloClient: ApolloClient<NormalizedCacheObject>
): (...args: GetNodeFunctionArgs) => Promise<GetNodeFunctionReturnType> {
	return async (...args) => {
		const result = await apolloClient.query({
			query: GetBaseNodeDocument,
			variables: {
				node_id: args[0]
			},
			fetchPolicy: 'network-only'
		});

		if (result?.data?.getNode) {
			return {
				...result.data.getNode,
				internal_link: buildInternalLink(result.data.getNode.id, result.data.getNode.type)
			};
		}
		throw new Error('no results');
	};
}

export const getNodeFunction = (): Parameters<typeof registerFunctions>[number] => {
	const apolloClient = buildClient();

	return {
		id: FUNCTION_IDS.GET_NODE,
		fn: getNodeWithClient(apolloClient)
	};
};
