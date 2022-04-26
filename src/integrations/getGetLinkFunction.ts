/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { AnyFunction, registerFunctions } from '@zextras/carbonio-shell-ui';

import buildClient from '../carbonio-files-ui-common/apollo';
import LINK from '../carbonio-files-ui-common/graphql/fragments/link.graphql';
import CREATE_LINK from '../carbonio-files-ui-common/graphql/mutations/createLink.graphql';
import { NodeWithMetadata } from '../carbonio-files-ui-common/types/common';
import {
	CreateLinkMutation,
	CreateLinkMutationVariables,
	LinkFragment
} from '../carbonio-files-ui-common/types/graphql/types';
import { FUNCTION_IDS } from '../constants';

type CreateLinkType = {
	node: Pick<NodeWithMetadata, 'id' | '__typename'>;
	description?: string;
	expiresAt?: number;
	type: 'createLink';
};

// type CreateDefaultLinkType = {
// 	nodeId: string;
// 	description?: string;
// 	expiresAt?: number;
// 	type: 'defaultLink';
// };

type GetLinkFunctionArgsType = CreateLinkType; // | CreateDefaultLinkType;

function getLinkWithClient(
	apolloClient: ApolloClient<NormalizedCacheObject>
): (args: GetLinkFunctionArgsType) => Promise<CreateLinkMutation['createLink']> {
	function getLink(args: GetLinkFunctionArgsType): Promise<CreateLinkMutation['createLink']> {
		const { node, description, expiresAt, type } = args;
		const { id, __typename } = node;

		if (type === 'createLink') {
			return new Promise<CreateLinkMutation['createLink']>((resolve, reject) => {
				apolloClient
					.mutate<CreateLinkMutation, CreateLinkMutationVariables>({
						mutation: CREATE_LINK,
						variables: {
							node_id: id,
							description,
							expires_at: expiresAt
						},
						update(cache, { data }) {
							if (data?.createLink) {
								cache.modify({
									id: cache.identify({ id, __typename }),
									fields: {
										links(existingLinks) {
											const newLinkRef = cache.writeFragment<LinkFragment>({
												data: data.createLink,
												fragment: LINK
											});
											return [newLinkRef, ...existingLinks];
										}
									}
								});
							}
						}
					})
					.then(
						(value) => {
							if (value?.data?.createLink) {
								resolve(value.data.createLink);
							} else {
								reject();
							}
						},
						(reason) => reject(reason)
					);
			});
		}
		return new Promise<CreateLinkMutation['createLink']>((resolve, reject) => {
			reject(new Error('the type field of args is missing or wrong'));
		});
	}

	return getLink;
}

export const getGetLinkFunction = (): Parameters<typeof registerFunctions>[number] => {
	const apolloClient = buildClient();

	return {
		id: FUNCTION_IDS.GET_LINK,
		fn: getLinkWithClient(apolloClient) as AnyFunction
	};
};
