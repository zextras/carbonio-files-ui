/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Reference } from '@apollo/client';

import { NodeSharesArgs, QueryFindNodesArgs, Share } from './graphql/types';

export interface NodesListCachedObject {
	ordered: Reference[];
	unOrdered: Reference[];
}

export interface NodesPage {
	// eslint-disable-next-line camelcase
	page_token: string;
	nodes: Reference[];
}

export interface NodesPageCachedObject {
	// eslint-disable-next-line camelcase
	page_token: string;
	nodes: NodesListCachedObject | undefined;
}

export interface FindNodesCachedObject extends NodesPageCachedObject {
	args: QueryFindNodesArgs | null;
}

export type ShareCachedObject = Omit<Share, 'node' | 'share_target'> & {
	node: Reference | undefined;
	share_target: Reference | undefined;
};

export interface SharesCachedObject {
	args: Partial<NodeSharesArgs> | null;
	shares: ShareCachedObject[];
}
