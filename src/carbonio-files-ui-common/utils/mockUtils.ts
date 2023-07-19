/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ApolloError, ServerError } from '@apollo/client';
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
import * as GQLTypes from '../types/graphql/types';
import { Maybe, Scalars } from '../types/graphql/types';

type Id = string;

type QueryName<TData> = keyof TData & keyof GQLTypes.QueryResolvers;

type MutationName<TData> = keyof TData & keyof GQLTypes.MutationResolvers;

type Mock<TData> = TData extends Pick<GQLTypes.Query, '__typename'>
	? GQLTypes.QueryResolvers[QueryName<TData>]
	: GQLTypes.MutationResolvers[MutationName<TData>];

export function mockFindNodes(...findNodes: Node[][]): Mock<GQLTypes.FindNodesQuery> {
	return () => {
		const nodes = findNodes.pop() || [];
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

export function mockUpdateNodeError(error: ServerError | ApolloError): never {
	throw error;
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

export function mockUpdateNodeDescriptionError(error: ServerError | ApolloError): never {
	throw error;
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

export function mockGetChildren(getNode: Node): Mock<GQLTypes.GetChildrenQuery> {
	return () => getNode;
}

export function mockGetChildrenError(error: ServerError | ApolloError): never {
	throw error;
}

export function mockMoveNodes(...moveNodes: Node[][]): Mock<GQLTypes.MoveNodesMutation> {
	return () => moveNodes.pop() || [];
}

export function mockCopyNodes(copyNodes: Node[]): Mock<GQLTypes.CopyNodesMutation> {
	return () => copyNodes;
}

export function mockCreateFolder(createFolder: Node): Mock<GQLTypes.CreateFolderMutation> {
	return () => createFolder;
}

export function mockCreateFolderError(error: ServerError | ApolloError): never {
	throw error;
}

export function mockGetPath(...getPath: Node[][]): Mock<GQLTypes.GetPathQuery> {
	return () => getPath.pop() || [];
}

export function mockGetPermissions(node: Node): Mock<GQLTypes.GetPermissionsQuery> {
	return () => node;
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
	...getNode: Array<GQLTypes.File | GQLTypes.Folder>
): Mock<GQLTypes.GetNodeQuery> {
	return (parent, args) => find<Node>(getNode, (node) => node.id === args.node_id) || null;
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

export function mockGetShares(getNode: Node): Mock<GQLTypes.GetSharesQuery> {
	return () => getNode;
}

export function mockGetBaseNode(getNode: Node): Mock<GQLTypes.GetBaseNodeQuery> {
	return () => getNode;
}

export function mockDeleteShare(deleteShare: boolean): Mock<GQLTypes.DeleteShareMutation> {
	return () => deleteShare;
}

export function mockCreateShare(
	createShare: GQLTypes.Share,
	callback?: (...args: unknown[]) => void
): Mock<GQLTypes.CreateShareMutation> {
	return (): typeof createShare => {
		callback?.();
		return createShare;
	};
}

export function mockCreateShareError(error: ApolloError | ServerError): never {
	throw error;
}

export function mockUpdateShare(
	updateShare: GQLTypes.Share,
	callback?: () => void
): Mock<GQLTypes.UpdateShareMutation> {
	return (): typeof updateShare => {
		callback?.();
		return updateShare;
	};
}

export function mockUpdateShareError(error: ApolloError | ServerError): never {
	throw error;
}

export function mockGetAccountByEmail(
	account: GQLTypes.Account,
	error?: ApolloError
): Mock<GQLTypes.GetAccountByEmailQuery> {
	if (error !== undefined) {
		throw error;
	}
	return () => account;
}

export function mockGetAccountsByEmail(
	accounts: GQLTypes.Account[],
	error?: ApolloError
): Mock<GQLTypes.GetAccountsByEmailQuery> {
	if (error !== undefined) {
		throw error;
	}
	return () => accounts;
}

export function mockGetLinks(links: Maybe<GQLTypes.Link>[]): Mock<GQLTypes.GetLinksQuery> {
	return () => links;
}

export function mockGetCollaborationLinks(
	collaborationLinks?: Array<Maybe<GQLTypes.CollaborationLink>>
): Mock<GQLTypes.GetCollaborationLinksQuery> {
	return () => collaborationLinks || [];
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

export function mockGetVersions(files: GQLTypes.File[]): Mock<GQLTypes.GetVersionsQuery> {
	return () => files;
}

export function mockDeleteVersions(
	versions: Array<Maybe<Scalars['Int']>>
): Mock<GQLTypes.DeleteVersionsMutation> {
	return () => versions;
}

export function mockKeepVersions(
	versions: Array<Maybe<Scalars['Int']>>
): Mock<GQLTypes.KeepVersionsMutation> {
	return () => versions;
}

export function mockCloneVersion(file: GQLTypes.File): Mock<GQLTypes.CloneVersionMutation> {
	return () => file;
}

export function mockGetRootsList(): Mock<GQLTypes.GetRootsListQuery> {
	return () => [
		{ __typename: 'Root', id: ROOTS.LOCAL_ROOT, name: ROOTS.LOCAL_ROOT },
		{ __typename: 'Root', id: ROOTS.TRASH, name: ROOTS.TRASH }
	];
}

export function mockGetConfigs(
	configs: Array<{ name: string; value: string }> = populateConfigs()
): Mock<GQLTypes.GetConfigsQuery> {
	return () => configs;
}

export function mockGetChild(node: Node): Mock<GQLTypes.GetChildQuery> {
	return () => node;
}

export function mockCreateLink(link: GQLTypes.Link): Mock<GQLTypes.CreateLinkMutation> {
	return () => link;
}

export function mockCreateLinkError(
	error: ApolloError | ServerError
): Mock<GQLTypes.CreateLinkMutation> {
	throw error;
}

export function mockUpdateLink(link: GQLTypes.Link): Mock<GQLTypes.UpdateLinkMutation> {
	return () => link;
}

export function mockUpdateLinkError(
	error: ApolloError | ServerError
): Mock<GQLTypes.UpdateLinkMutation> {
	throw error;
}
