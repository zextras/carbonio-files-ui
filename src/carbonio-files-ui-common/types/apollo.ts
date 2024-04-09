/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Reference } from '@apollo/client';

import { Node, Folder, Maybe, NodeSharesArgs, QueryFindNodesArgs, Share } from './graphql/types';

export interface NodesListCachedObject {
	ordered: Reference[];
	unOrdered: Reference[];
}

export interface NodesPage {
	page_token: string;
	nodes: Maybe<Reference>[];
}

export interface FolderCachedObject extends Omit<Folder, 'children'> {
	children: NodesPageCachedObject;
}

export interface NodesPageCachedObject {
	page_token: string;
	nodes: NodesListCachedObject | undefined;
}

export interface FindNodesCachedObject extends NodesPageCachedObject {
	args: QueryFindNodesArgs | null;
}

export type ShareCachedObject = Omit<Share, 'node' | 'share_target'> & {
	node: Reference | undefined;
	share_target: Reference | null | undefined;
};

export interface SharesCachedObject {
	args: Partial<NodeSharesArgs> | null;
	shares: ShareCachedObject[];
}

export interface QueryCachedObject {
	findNodes: FindNodesCachedObject;
}

export interface NodeCachedObject extends Omit<Node, 'shares' | 'links'> {
	shares: SharesCachedObject;
	links: Reference[];
}
