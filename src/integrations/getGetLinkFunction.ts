/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { AnyFunction, registerFunctions } from '@zextras/carbonio-shell-ui';
import { map, find } from 'lodash';

import buildClient from '../carbonio-files-ui-common/apollo';
import LINK from '../carbonio-files-ui-common/graphql/fragments/link.graphql';
import CREATE_LINK from '../carbonio-files-ui-common/graphql/mutations/createLink.graphql';
import GET_NODE_LINKS from '../carbonio-files-ui-common/graphql/queries/getNodeLinks.graphql';
import { NodeWithMetadata } from '../carbonio-files-ui-common/types/common';
import {
	CreateLinkMutation,
	CreateLinkMutationVariables,
	GetNodeLinksQuery,
	GetNodeLinksQueryVariables,
	LinkFragment
} from '../carbonio-files-ui-common/types/graphql/types';
import { FUNCTION_IDS } from '../constants';

type CreateLinkType = {
	node: Pick<NodeWithMetadata, 'id' | '__typename'>;
	description?: string;
	expiresAt?: number;
	type: 'createLink';
};

type GetLinksInfoType = {
	node: Pick<NodeWithMetadata, 'id' | '__typename'>;
	type: 'getLinksInfo';
	linkIds?: Array<string>;
};

type LinksType = Array<{
	__typename?: 'Link';
	id: string;
	url?: string | null;
	description?: string | null;
	expires_at?: number | null;
	created_at: number;
	node: { __typename?: 'File'; id: string } | { __typename?: 'Folder'; id: string };
} | null>;

type GetLinkFunctionArgsType = CreateLinkType | GetLinksInfoType;

function isCreateLinkType(args: GetLinkFunctionArgsType): args is CreateLinkType {
	return args.type === 'createLink';
}

function isGetLinksInfoType(args: GetLinkFunctionArgsType): args is GetLinksInfoType {
	return args.type === 'getLinksInfo';
}

function getLinkWithClient(
	apolloClient: ApolloClient<NormalizedCacheObject>
): (args: GetLinkFunctionArgsType) => Promise<CreateLinkMutation['createLink'] | LinksType> {
	function getLink(
		args: GetLinkFunctionArgsType
	): Promise<CreateLinkMutation['createLink'] | LinksType> {
		if (isCreateLinkType(args)) {
			const { node, description, expiresAt } = args;
			const { id, __typename } = node;
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
		if (isGetLinksInfoType(args)) {
			const { node, linkIds } = args;

			return new Promise<LinksType>((resolve, reject) => {
				apolloClient
					.query<GetNodeLinksQuery, GetNodeLinksQueryVariables>({
						// used getNodeLinks instead of getLinks because getLinks has some issues on error handling
						query: GET_NODE_LINKS,
						variables: {
							node_id: node.id
						}
					})
					.then(
						(value) => {
							if (value?.data?.getNode?.links) {
								const links = value?.data?.getNode?.links;
								if (linkIds) {
									resolve(
										map(linkIds, (id) => {
											const link = find(links, ['id', id]);
											return link || null;
										})
									);
								} else {
									resolve(value.data.getNode.links);
								}
							} else {
								reject();
							}
						},
						(reason) => {
							reject(reason);
						}
					);
			});
		}
		return new Promise((resolve, reject) => {
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
