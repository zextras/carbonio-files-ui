/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLError } from 'graphql';
import { findIndex, last } from 'lodash';

import { NODES_LOAD_LIMIT, NODES_SORT_DEFAULT, ROOTS, SHARES_LOAD_LIMIT } from '../constants';
import { populateConfigs, populateNodePage } from '../mocks/mockUtils';
import { Node } from '../types/common';
import { MutationResolvers, QueryResolvers } from '../types/graphql/resolvers-types';
import type * as GQLTypes from '../types/graphql/types';
import { Maybe } from '../types/graphql/types';

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

export function shiftData<TData>(data: TData[]): NonNullable<TData> {
	const result = data.shift();
	if (result) {
		return result;
	}
	throw new GraphQLError('no more data provided to resolver');
}

export function getFindNodesVariables(
	variables: Partial<GQLTypes.FindNodesQueryVariables>,
	withCursor = false
): GQLTypes.FindNodesQueryVariables {
	return {
		limit: NODES_LOAD_LIMIT,
		sort: NODES_SORT_DEFAULT,
		page_token: withCursor ? 'next_page_token' : undefined,
		shares_limit: SHARES_LOAD_LIMIT,
		...variables
	};
}

export function mockFindNodes(...findNodes: Node[][]): Mock<GQLTypes.FindNodesQuery> {
	return () => {
		const nodes = shiftData(findNodes);
		return populateNodePage(nodes);
	};
}

export function mockTrashNodes(...trashNodes: Id[][]): Mock<GQLTypes.TrashNodesMutation> {
	return () => shiftData(trashNodes);
}

export function mockRestoreNodes(
	...restoreNodes: Array<Node>[]
): Mock<GQLTypes.RestoreNodesMutation> {
	return () => shiftData(restoreNodes);
}

export function mockDeletePermanently(...deleteNodes: Id[][]): Mock<GQLTypes.DeleteNodesMutation> {
	return () => shiftData(deleteNodes);
}

export function mockUpdateNode(...updateNode: Node[]): Mock<GQLTypes.UpdateNodeMutation> {
	return () => shiftData(updateNode);
}

export function mockFlagNodes(...flagNodes: Id[][]): Mock<GQLTypes.FlagNodesMutation> {
	return () => shiftData(flagNodes);
}

export function getChildrenVariables(
	folderId: Id,
	childrenLimit = NODES_LOAD_LIMIT,
	sort = NODES_SORT_DEFAULT,
	sharesLimit = SHARES_LOAD_LIMIT,
	withCursor = false,
	pageToken = 'next_page_token'
): GQLTypes.GetChildrenQueryVariables {
	return {
		node_id: folderId,
		children_limit: childrenLimit,
		sort,
		shares_limit: sharesLimit,
		page_token: withCursor ? pageToken : undefined
	};
}

export function mockMoveNodes(...moveNodes: Node[][]): Mock<GQLTypes.MoveNodesMutation> {
	return () => shiftData(moveNodes);
}

export function mockCopyNodes(...copyNodes: Node[][]): Mock<GQLTypes.CopyNodesMutation> {
	return () => shiftData(copyNodes);
}

export function mockCreateFolder(...createFolder: Node[]): Mock<GQLTypes.CreateFolderMutation> {
	return () => shiftData(createFolder);
}

export function mockGetPath(...getPath: Node[][]): Mock<GQLTypes.GetPathQuery> {
	// this resolver assumes that the path has always at least one node,
	// and that the last node of the path is always the node for which the getPath
	// request has been made
	return (parent, args) => {
		const matchIndex = findIndex(getPath, (path) => last(path)?.id === args.node_id);
		if (matchIndex >= 0) {
			const resultArray = getPath.splice(matchIndex, 1);
			if (resultArray.length > 0) {
				return resultArray[0];
			}
		}
		throw new GraphQLError('no more responses provided for resolver');
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
	getNode: Partial<
		Record<
			'getChildren' | 'getNode' | 'getShares' | 'getBaseNode' | 'getPermissions' | 'getChild',
			Array<GQLTypes.File | GQLTypes.Folder>
		>
	>
): Mock<GQLTypes.GetNodeQuery> {
	return (parent, args, context, info) => {
		const operationName = info.operation.name?.value;
		if (operationName && operationName in getNode) {
			const operationResults = getNode[operationName as keyof typeof getNode];
			if (operationResults !== undefined) {
				const matchIndex = findIndex(operationResults, (node) => node.id === args.node_id);
				if (matchIndex >= 0) {
					const resultArray = operationResults.splice(matchIndex, 1);
					if (resultArray.length > 0) {
						return resultArray[0];
					}
				}
			}
		}
		throw new GraphQLError(
			`no more responses provided for resolver getNode and operation ${operationName}`
		);
	};
}

export function mockDeleteShare(...deleteShare: boolean[]): Mock<GQLTypes.DeleteShareMutation> {
	return () => shiftData(deleteShare);
}

export function mockCreateShare(
	...createShare: GQLTypes.Share[]
): Mock<GQLTypes.CreateShareMutation> {
	return () => shiftData(createShare);
}

export function mockUpdateShare(
	...updateShare: GQLTypes.Share[]
): Mock<GQLTypes.UpdateShareMutation> {
	return () => shiftData(updateShare);
}

export function mockGetAccountByEmail(
	...accounts: GQLTypes.Account[]
): Mock<GQLTypes.GetAccountByEmailQuery> {
	return (parent, args) => {
		const matchIndex = findIndex(
			accounts,
			(account) => account.__typename === 'User' && account.email === args.email
		);
		if (matchIndex >= 0) {
			const results = accounts.splice(matchIndex, 1);
			if (results.length > 0) {
				return results[0];
			}
		}
		throw new GraphQLError('no more responses provided for resolver');
	};
}

export function mockGetAccountsByEmail(
	...accounts: GQLTypes.Account[][]
): Mock<GQLTypes.GetAccountsByEmailQuery> {
	return () => shiftData(accounts);
}

export function mockGetLinks(...links: Maybe<GQLTypes.Link>[][]): Mock<GQLTypes.GetLinksQuery> {
	return () => shiftData(links);
}

export function mockGetCollaborationLinks(
	...collaborationLinks: Array<Maybe<GQLTypes.CollaborationLink>>[]
): Mock<GQLTypes.GetCollaborationLinksQuery> {
	return () => shiftData(collaborationLinks);
}

export function mockCreateCollaborationLink(
	createCollaborationLink: GQLTypes.CollaborationLink
): Mock<GQLTypes.CreateCollaborationLinkMutation> {
	return () => createCollaborationLink;
}

export function mockDeleteCollaborationLinks(
	...deleteCollaborationLinks: Array<string>[]
): Mock<GQLTypes.DeleteCollaborationLinksMutation> {
	return () => shiftData(deleteCollaborationLinks);
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
	...versions: Array<Maybe<number>>[]
): Mock<GQLTypes.DeleteVersionsMutation> {
	return () => shiftData(versions);
}

export function mockKeepVersions(
	...versions: Array<Maybe<number>>[]
): Mock<GQLTypes.KeepVersionsMutation> {
	return () => shiftData(versions);
}

export function mockCloneVersion(...file: GQLTypes.File[]): Mock<GQLTypes.CloneVersionMutation> {
	return () => shiftData(file);
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

export function mockCreateLink(...link: GQLTypes.Link[]): Mock<GQLTypes.CreateLinkMutation> {
	return () => shiftData(link);
}

export function mockUpdateLink(...link: GQLTypes.Link[]): Mock<GQLTypes.UpdateLinkMutation> {
	return () => shiftData(link);
}
export function mockDeleteLinks(...link: Array<string>[]): Mock<GQLTypes.DeleteLinksMutation> {
	return () => shiftData(link);
}
