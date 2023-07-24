/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLError } from 'graphql';
import { find } from 'lodash';

import {
	FULL_SHARES_LOAD_LIMIT,
	NODES_LOAD_LIMIT,
	NODES_SORT_DEFAULT,
	ROOTS,
	SHARES_LOAD_LIMIT
} from '../constants';
import { populateConfigs, populateNodePage } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { MutationResolvers, QueryResolvers } from '../types/graphql/resolvers-types';
import type * as GQLTypes from '../types/graphql/types';
import { Maybe, Scalars } from '../types/graphql/types';
import { ArrayOneOrMore, OneOrMany } from '../types/utils';

type Id = string;

type QueryName<TData> = keyof TData & keyof QueryResolvers;

type MutationName<TData> = keyof TData & keyof MutationResolvers;

type Mock<
	TData extends Pick<GQLTypes.Query, '__typename'> | Pick<GQLTypes.Mutation, '__typename'>
> = TData extends Pick<GQLTypes.Query, '__typename'>
	? QueryResolvers[QueryName<TData>]
	: MutationResolvers[MutationName<TData>];

export function mockErrorResolver(error: GraphQLError): () => never {
	return () => {
		throw error;
	};
}

export function mockFindNodes(...findNodes: Node[][]): Mock<GQLTypes.FindNodesQuery> {
	return () => {
		const nodes = findNodes.shift() || [];
		return populateNodePage(nodes);
	};
}

export function mockTrashNodes(trashNodes: Id[]): Mock<GQLTypes.TrashNodesMutation> {
	return () => trashNodes;
}

export function mockRestoreNodes(restoreNodes: Array<Node>): Mock<GQLTypes.RestoreNodesMutation> {
	return () => restoreNodes;
}

export function mockDeletePermanently(deleteNodes: Id[]): Mock<GQLTypes.DeleteNodesMutation> {
	return () => deleteNodes;
}

export function mockUpdateNode(updateNode: Node): Mock<GQLTypes.UpdateNodeMutation> {
	return () => updateNode;
}

export function mockUpdateNodeDescription(
	updateNode: Node,
	callback?: () => void
): Mock<GQLTypes.UpdateNodeDescriptionMutation> {
	return (): typeof updateNode => {
		callback?.();
		return updateNode;
	};
}

export function mockFlagNodes(flagNodes: Id[]): Mock<GQLTypes.FlagNodesMutation> {
	return () => flagNodes;
}

export function getChildrenVariables(
	folderId: Id,
	childrenLimit = NODES_LOAD_LIMIT,
	sort = NODES_SORT_DEFAULT,
	sharesLimit = SHARES_LOAD_LIMIT,
	withCursor = false
): GQLTypes.GetChildrenQueryVariables {
	return {
		node_id: folderId,
		children_limit: childrenLimit,
		sort,
		shares_limit: sharesLimit,
		page_token: withCursor ? 'next_page_token' : undefined
	};
}

export function mockMoveNodes(...moveNodes: Node[][]): Mock<GQLTypes.MoveNodesMutation> {
	return () => moveNodes.shift() || [];
}

export function mockCopyNodes(copyNodes: Node[]): Mock<GQLTypes.CopyNodesMutation> {
	return () => copyNodes;
}

export function mockCreateFolder(createFolder: Node): Mock<GQLTypes.CreateFolderMutation> {
	return () => createFolder;
}

export function mockGetPath(
	...getPath: Array<OneOrMany<ArrayOneOrMore<Node>>>
): Mock<GQLTypes.GetPathQuery> {
	// this resolver assumes that the path has always at least one node,
	// and that the last node of the path is always the node for which the getPath
	// request has been made
	return (parent, args) => {
		const match = find(getPath, (path) => {
			if (path.length > 0) {
				// if the current iterated item is an array,
				// check if the last element of the first sub-path matches the id
				if (Array.isArray(path[0]) && path[0].length > 0) {
					return path[0][path[0].length - 1].id === args.node_id;
				}
				// otherwise, check if the last element of the current path matches the id
				const lastNodeOfPath = path[path.length - 1];
				if (!Array.isArray(lastNodeOfPath)) {
					return lastNodeOfPath.id === args.node_id;
				}
			}
			return false;
		});
		if (match !== undefined) {
			if (Array.isArray(match[0])) {
				const firstPath = (match as ArrayOneOrMore<Node>[]).shift();
				if (firstPath !== undefined) {
					return firstPath;
				}
			} else {
				return match as ArrayOneOrMore<Node>;
			}
		}
		throw new Error('no more getPath responses provided to resolver');
	};
}

export function getNodeVariables(
	nodeId: Id,
	childrenLimit = NODES_LOAD_LIMIT,
	sort = NODES_SORT_DEFAULT,
	sharesLimit = SHARES_LOAD_LIMIT
): GQLTypes.GetNodeQueryVariables {
	return {
		node_id: nodeId,
		children_limit: childrenLimit,
		sort,
		shares_limit: sharesLimit
	};
}

export function mockGetNode(
	...getNode: Array<OneOrMany<GQLTypes.File | GQLTypes.Folder>>
): Mock<GQLTypes.GetNodeQuery> {
	return (parent, args) => {
		const match =
			find(getNode, (node) => {
				if (!Array.isArray(node)) {
					return node.id === args.node_id;
				}
				return node.length > 0 && node[0].id === args.node_id;
			}) || null;
		if (match !== undefined) {
			if (Array.isArray(match)) {
				const result = match.shift();
				if (result !== undefined) {
					return result;
				}
			} else {
				return match;
			}
		}
		throw new Error('no more getNode responses provided to resolver');
	};
}

export function getSharesVariables(
	nodeId: Id,
	sharesLimit = FULL_SHARES_LOAD_LIMIT
): GQLTypes.GetSharesQueryVariables {
	return {
		node_id: nodeId,
		shares_limit: sharesLimit
	};
}

export function mockDeleteShare(deleteShare: boolean): Mock<GQLTypes.DeleteShareMutation> {
	return () => deleteShare;
}

export function mockCreateShare(
	...createShare: GQLTypes.Share[]
): Mock<GQLTypes.CreateShareMutation> {
	return () => {
		const result = createShare.shift();
		if (result !== undefined) {
			return result;
		}
		throw new Error('no more createShares response provided to resolver');
	};
}

export function mockUpdateShare(updateShare: GQLTypes.Share): Mock<GQLTypes.UpdateShareMutation> {
	return (): typeof updateShare => updateShare;
}

export function mockGetAccountByEmail(
	...accounts: GQLTypes.Account[]
): Mock<GQLTypes.GetAccountByEmailQuery> {
	return (parent, args) =>
		find(accounts, (account) => account.__typename === 'User' && account.email === args.email) ||
		null;
}

export function mockGetAccountsByEmail(
	accounts: GQLTypes.Account[]
): Mock<GQLTypes.GetAccountsByEmailQuery> {
	return () => accounts;
}

export function mockGetLinks(links: Maybe<GQLTypes.Link>[]): Mock<GQLTypes.GetLinksQuery> {
	return () => links;
}

export function mockGetCollaborationLinks(
	collaborationLinks: Array<Maybe<GQLTypes.CollaborationLink>>
): Mock<GQLTypes.GetCollaborationLinksQuery> {
	return () => collaborationLinks;
}

export function mockCreateCollaborationLink(
	createCollaborationLink: GQLTypes.CollaborationLink
): Mock<GQLTypes.CreateCollaborationLinkMutation> {
	return () => createCollaborationLink;
}

export function mockDeleteCollaborationLinks(
	deleteCollaborationLinks: Array<string>
): Mock<GQLTypes.DeleteCollaborationLinksMutation> {
	return () => deleteCollaborationLinks;
}

export function mockGetVersions(
	...files: GQLTypes.Query['getVersions'][]
): Mock<GQLTypes.GetVersionsQuery> {
	return () => {
		const result = files.shift();
		if (result) {
			return result;
		}
		throw new Error('no more getVersions responses provided to resolver');
	};
}

export function mockDeleteVersions(
	versions: Array<Maybe<Scalars['Int']>>
): Mock<GQLTypes.DeleteVersionsMutation> {
	return () => versions;
}

export function mockKeepVersions(
	...versions: Array<Maybe<Scalars['Int']>>[]
): Mock<GQLTypes.KeepVersionsMutation> {
	return () => {
		const result = versions.shift();
		if (result) {
			return result;
		}
		throw new Error('no more keepVersions responses provided to resolver');
	};
}

export function mockCloneVersion(file: GQLTypes.File): Mock<GQLTypes.CloneVersionMutation> {
	return () => file;
}

export function mockGetRootsList(): Mock<GQLTypes.GetRootsListQuery> {
	return () =>
		[
			{ __typename: 'Root', id: ROOTS.LOCAL_ROOT, name: ROOTS.LOCAL_ROOT },
			{ __typename: 'Root', id: ROOTS.TRASH, name: ROOTS.TRASH }
		] satisfies GQLTypes.GetRootsListQuery['getRootsList'];
}

export function mockGetConfigs(
	configs: Array<GQLTypes.Config> = populateConfigs()
): Mock<GQLTypes.GetConfigsQuery> {
	return () => configs;
}

export function mockCreateLink(link: GQLTypes.Link): Mock<GQLTypes.CreateLinkMutation> {
	return () => link;
}

export function mockUpdateLink(link: GQLTypes.Link): Mock<GQLTypes.UpdateLinkMutation> {
	return () => link;
}
