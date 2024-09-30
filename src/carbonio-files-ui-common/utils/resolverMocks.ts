/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { GraphQLError } from 'graphql';
import { findIndex, last } from 'lodash';

import { NODES_LOAD_LIMIT, NODES_SORT_DEFAULT, ROOTS, SHARES_LOAD_LIMIT } from '../constants';
import { populateConfigs, populateNodePage } from '../mocks/mockUtils';
import { MutationResolvers, QueryResolvers } from '../types/graphql/resolvers-types';
import type * as GQLTypes from '../types/graphql/types';
import { Maybe, NodePage } from '../types/graphql/types';

type QueryName<TData> = keyof TData & keyof QueryResolvers;

type MutationName<TData> = keyof TData & keyof MutationResolvers;

export type QueryMock<TData> = QueryResolvers[QueryName<TData>];
export type MutationMock<TData> = MutationResolvers[MutationName<TData>];

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

export function mockFindNodes(
	...findNodes: NodePage['nodes'][]
): QueryMock<GQLTypes.FindNodesQuery> {
	return () => {
		const nodes = shiftData(findNodes);
		return populateNodePage(nodes);
	};
}

export function mockTrashNodes(
	...trashNodes: string[][]
): MutationMock<GQLTypes.TrashNodesMutation> {
	return () => shiftData(trashNodes);
}

export function mockRestoreNodes(
	...restoreNodes: (GQLTypes.File | GQLTypes.Folder)[][]
): MutationMock<GQLTypes.RestoreNodesMutation> {
	return () => shiftData(restoreNodes);
}

export function mockDeletePermanently(
	...deleteNodes: string[][]
): MutationMock<GQLTypes.DeleteNodesMutation> {
	return () => shiftData(deleteNodes);
}

export function mockUpdateNode(
	...updateNode: (GQLTypes.File | GQLTypes.Folder)[]
): MutationMock<GQLTypes.UpdateNodeMutation> {
	return () => shiftData(updateNode);
}

export function mockFlagNodes(...flagNodes: string[][]): MutationMock<GQLTypes.FlagNodesMutation> {
	return () => shiftData(flagNodes);
}

export function getChildrenVariables(
	folderstring: string,
	childrenLimit = NODES_LOAD_LIMIT,
	sort = NODES_SORT_DEFAULT,
	sharesLimit = SHARES_LOAD_LIMIT,
	withCursor = false,
	pageToken = 'next_page_token'
): GQLTypes.GetChildrenQueryVariables {
	return {
		node_id: folderstring,
		children_limit: childrenLimit,
		sort,
		shares_limit: sharesLimit,
		page_token: withCursor ? pageToken : undefined
	};
}

export function mockMoveNodes(
	...moveNodes: (GQLTypes.File | GQLTypes.Folder)[][]
): MutationMock<GQLTypes.MoveNodesMutation> {
	return () => shiftData(moveNodes);
}

export function mockCopyNodes(
	...copyNodes: (GQLTypes.File | GQLTypes.Folder)[][]
): MutationMock<GQLTypes.CopyNodesMutation> {
	return () => shiftData(copyNodes);
}

export function mockCreateFolder(
	...createFolder: GQLTypes.Folder[]
): MutationMock<GQLTypes.CreateFolderMutation> {
	return () => shiftData(createFolder);
}

export function mockGetPath(
	...getPath: (GQLTypes.File | GQLTypes.Folder)[][]
): QueryMock<GQLTypes.GetPathQuery> {
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
	nodestring: string,
	childrenLimit = NODES_LOAD_LIMIT,
	sort = NODES_SORT_DEFAULT,
	sharesLimit = SHARES_LOAD_LIMIT
): GQLTypes.GetNodeQueryVariables {
	return {
		node_id: nodestring,
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
): QueryMock<GQLTypes.GetNodeQuery> {
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

export function mockDeleteShare(
	...deleteShare: boolean[]
): MutationMock<GQLTypes.DeleteShareMutation> {
	return () => shiftData(deleteShare);
}

export function mockCreateShare(
	...createShare: GQLTypes.Share[]
): MutationMock<GQLTypes.CreateShareMutation> {
	return () => shiftData(createShare);
}

export function mockUpdateShare(
	...updateShare: GQLTypes.Share[]
): MutationMock<GQLTypes.UpdateShareMutation> {
	return () => shiftData(updateShare);
}

export function mockGetAccountByEmail(
	...accounts: GQLTypes.Account[]
): QueryMock<GQLTypes.GetAccountByEmailQuery> {
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
): QueryMock<GQLTypes.GetAccountsByEmailQuery> {
	return () => shiftData(accounts);
}

export function mockGetLinks(
	...links: Maybe<GQLTypes.Link>[][]
): QueryMock<GQLTypes.GetLinksQuery> {
	return () => shiftData(links);
}

export function mockGetCollaborationLinks(
	...collaborationLinks: Array<Maybe<GQLTypes.CollaborationLink>>[]
): QueryMock<GQLTypes.GetCollaborationLinksQuery> {
	return () => shiftData(collaborationLinks);
}

export function mockCreateCollaborationLink(
	createCollaborationLink: GQLTypes.CollaborationLink
): MutationMock<GQLTypes.CreateCollaborationLinkMutation> {
	return () => createCollaborationLink;
}

export function mockDeleteCollaborationLinks(
	...deleteCollaborationLinks: Array<string>[]
): MutationMock<GQLTypes.DeleteCollaborationLinksMutation> {
	return () => shiftData(deleteCollaborationLinks);
}

export function mockGetVersions(
	...files: GQLTypes.Query['getVersions'][]
): QueryMock<GQLTypes.GetVersionsQuery> {
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
): MutationMock<GQLTypes.DeleteVersionsMutation> {
	return () => shiftData(versions);
}

export function mockKeepVersions(
	...versions: Array<Maybe<number>>[]
): MutationMock<GQLTypes.KeepVersionsMutation> {
	return () => shiftData(versions);
}

export function mockCloneVersion(
	...file: GQLTypes.File[]
): MutationMock<GQLTypes.CloneVersionMutation> {
	return () => shiftData(file);
}

export function mockGetRootsList(): QueryMock<GQLTypes.GetRootsListQuery> {
	return () =>
		[
			{ __typename: 'Root', id: ROOTS.LOCAL_ROOT, name: ROOTS.LOCAL_ROOT },
			{ __typename: 'Root', id: ROOTS.TRASH, name: ROOTS.TRASH }
		] satisfies GQLTypes.GetRootsListQuery['getRootsList'];
}

export function mockGetConfigs(
	configs: Array<GQLTypes.Config> = populateConfigs()
): QueryMock<GQLTypes.GetConfigsQuery> {
	return () => configs;
}

export function mockCreateLink(
	...link: GQLTypes.Link[]
): MutationMock<GQLTypes.CreateLinkMutation> {
	return () => shiftData(link);
}

export function mockUpdateLink(
	...link: GQLTypes.Link[]
): MutationMock<GQLTypes.UpdateLinkMutation> {
	return () => shiftData(link);
}
export function mockDeleteLinks(
	...link: Array<string>[]
): MutationMock<GQLTypes.DeleteLinksMutation> {
	return () => shiftData(link);
}
