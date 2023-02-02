/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ApolloError, ServerError } from '@apollo/client';
import { MockedResponse } from '@apollo/client/testing';
import { DocumentNode } from 'graphql';

import {
	FULL_SHARES_LOAD_LIMIT,
	NODES_LOAD_LIMIT,
	NODES_SORT_DEFAULT,
	ROOTS,
	SHARES_LOAD_LIMIT
} from '../constants';
import CLONE_VERSION from '../graphql/mutations/cloneVersion.graphql';
import COPY_NODES from '../graphql/mutations/copyNodes.graphql';
import CREATE_COLLABORATION_LINK from '../graphql/mutations/createCollaborationLink.graphql';
import CREATE_FOLDER from '../graphql/mutations/createFolder.graphql';
import CREATE_LINK from '../graphql/mutations/createLink.graphql';
import CREATE_SHARE from '../graphql/mutations/createShare.graphql';
import DELETE_COLLABORATION_LINKS from '../graphql/mutations/deleteCollaborationLinks.graphql';
import DELETE_NODES from '../graphql/mutations/deleteNodes.graphql';
import DELETE_SHARE from '../graphql/mutations/deleteShare.graphql';
import DELETE_VERSIONS from '../graphql/mutations/deleteVersions.graphql';
import FLAG_NODES from '../graphql/mutations/flagNodes.graphql';
import KEEP_VERSIONS from '../graphql/mutations/keepVersions.graphql';
import MOVE_NODES from '../graphql/mutations/moveNodes.graphql';
import RESTORE_NODES from '../graphql/mutations/restoreNodes.graphql';
import TRASH_NODES from '../graphql/mutations/trashNodes.graphql';
import UPDATE_LINK from '../graphql/mutations/updateLink.graphql';
import UPDATE_NODE from '../graphql/mutations/updateNode.graphql';
import UPDATE_NODE_DESCRIPTION from '../graphql/mutations/updateNodeDescription.graphql';
import UPDATE_SHARE from '../graphql/mutations/updateShare.graphql';
import FIND_NODES from '../graphql/queries/findNodes.graphql';
import GET_ACCOUNT_BY_EMAIL from '../graphql/queries/getAccountByEmail.graphql';
import GET_ACCOUNTS_BY_EMAIL from '../graphql/queries/getAccountsByEmail.graphql';
import GET_BASE_NODE from '../graphql/queries/getBaseNode.graphql';
import GET_CHILD from '../graphql/queries/getChild.graphql';
import GET_CHILDREN from '../graphql/queries/getChildren.graphql';
import GET_CONFIGS from '../graphql/queries/getConfigs.graphql';
import GET_NODE from '../graphql/queries/getNode.graphql';
import GET_NODE_COLLABORATION_LINKS from '../graphql/queries/getNodeCollaborationLinks.graphql';
import GET_NODE_LINKS from '../graphql/queries/getNodeLinks.graphql';
import GET_PARENT from '../graphql/queries/getParent.graphql';
import GET_PATH from '../graphql/queries/getPath.graphql';
import GET_PERMISSIONS from '../graphql/queries/getPermissions.graphql';
import GET_ROOTS_LIST from '../graphql/queries/getRootsList.graphql';
import GET_SHARES from '../graphql/queries/getShares.graphql';
import GET_VERSIONS from '../graphql/queries/getVersions.graphql';
import { populateConfigs, populateNodePage } from '../mocks/mockUtils';
import {
	CopyNodesMutationVariables,
	CreateFolderMutationVariables,
	DeleteNodesMutationVariables,
	FindNodesQueryVariables,
	FlagNodesMutationVariables,
	GetBaseNodeQueryVariables,
	GetChildrenQueryVariables,
	GetNodeQueryVariables,
	GetParentQueryVariables,
	GetPathQueryVariables,
	GetSharesQueryVariables,
	MoveNodesMutationVariables,
	Node,
	Query as QueryType,
	TrashNodesMutationVariables,
	RestoreNodesMutationVariables,
	UpdateNodeDescriptionMutationVariables,
	UpdateNodeMutationVariables,
	DeleteShareMutationVariables,
	CreateShareMutationVariables,
	UpdateShareMutationVariables,
	Share,
	GetAccountByEmailQueryVariables,
	GetNodeLinksQueryVariables,
	GetVersionsQueryVariables,
	File,
	DeleteVersionsMutationVariables,
	Maybe,
	Scalars,
	KeepVersionsMutationVariables,
	CloneVersionMutationVariables,
	FindNodesQuery,
	TrashNodesMutation,
	RestoreNodesMutation,
	DeleteNodesMutation,
	UpdateNodeMutation,
	UpdateNodeDescriptionMutation,
	FlagNodesMutation,
	GetChildrenQuery,
	MoveNodesMutation,
	CopyNodesMutation,
	CreateFolderMutation,
	GetParentQuery,
	GetPathQuery,
	GetNodeQuery,
	Folder,
	GetSharesQuery,
	GetBaseNodeQuery,
	DeleteShareMutation,
	CreateShareMutation,
	UpdateShareMutation,
	GetAccountByEmailQuery,
	GetNodeLinksQuery,
	GetVersionsQuery,
	DeleteVersionsMutation,
	KeepVersionsMutation,
	CloneVersionMutation,
	GetRootsListQuery,
	GetRootsListQueryVariables,
	GetPermissionsQueryVariables,
	GetPermissionsQuery,
	GetConfigsQuery,
	GetConfigsQueryVariables,
	GetAccountsByEmailQueryVariables,
	GetAccountsByEmailQuery,
	GetNodeCollaborationLinksQueryVariables,
	GetNodeCollaborationLinksQuery,
	CollaborationLink,
	CreateCollaborationLinkMutationVariables,
	CreateCollaborationLinkMutation,
	DeleteCollaborationLinksMutationVariables,
	DeleteCollaborationLinksMutation,
	GetChildQuery,
	GetChildQueryVariables,
	CreateLinkMutationVariables,
	Link,
	CreateLinkMutation,
	UpdateLinkMutationVariables,
	UpdateLinkMutation
} from '../types/graphql/types';

type Id = string;

type MockVariablePossibleType =
	| FindNodesQueryVariables
	| TrashNodesMutationVariables
	| RestoreNodesMutationVariables
	| DeleteNodesMutationVariables
	| UpdateNodeMutationVariables
	| UpdateNodeDescriptionMutationVariables
	| GetChildrenQueryVariables
	| MoveNodesMutationVariables
	| CreateFolderMutationVariables
	| FlagNodesMutationVariables
	| GetPathQueryVariables
	| GetParentQueryVariables
	| GetPermissionsQueryVariables
	| CopyNodesMutationVariables
	| GetNodeQueryVariables
	| GetSharesQueryVariables
	| GetBaseNodeQueryVariables
	| DeleteShareMutationVariables
	| CreateShareMutationVariables
	| UpdateShareMutationVariables
	| GetAccountByEmailQueryVariables
	| GetAccountsByEmailQueryVariables
	| GetNodeLinksQueryVariables
	| GetNodeCollaborationLinksQueryVariables
	| DeleteCollaborationLinksMutationVariables
	| DeleteVersionsMutationVariables
	| GetVersionsQueryVariables
	| GetChildQueryVariables
	| CreateLinkMutationVariables
	| UpdateLinkMutationVariables;

export interface Mock<
	TData = Record<string, unknown>,
	V extends MockVariablePossibleType = Record<string, unknown>
> extends MockedResponse<TData> {
	request: {
		query: DocumentNode;
		variables: V;
	};
	error?: ServerError | ApolloError;
}

/**
 * Find Nodes Mock
 */
export function getFindNodesVariables(
	variables: Partial<FindNodesQueryVariables>,
	withCursor = false
): FindNodesQueryVariables {
	return {
		limit: NODES_LOAD_LIMIT,
		sort: NODES_SORT_DEFAULT,
		page_token: withCursor ? 'next_page_token' : undefined,
		shares_limit: 1,
		...variables
	};
}

export function mockFindNodes(
	variables: FindNodesQueryVariables,
	nodes: Node[]
): Mock<FindNodesQuery, FindNodesQueryVariables> {
	return {
		request: {
			query: FIND_NODES,
			variables
		},
		result: {
			data: {
				findNodes: populateNodePage(nodes, variables.limit)
			}
		}
	};
}

/**
 * Trash Nodes Mock
 */

export function mockTrashNodes(
	variables: TrashNodesMutationVariables,
	trashNodes: Id[]
): Mock<TrashNodesMutation, TrashNodesMutationVariables> {
	return {
		request: {
			query: TRASH_NODES,
			variables
		},
		result: {
			data: {
				trashNodes
			}
		}
	};
}

/**
 * Restore Nodes Mock
 */
export function mockRestoreNodes(
	variables: RestoreNodesMutationVariables,
	restoreNodes: Array<Node>
): Mock<RestoreNodesMutation, RestoreNodesMutationVariables> {
	return {
		request: {
			query: RESTORE_NODES,
			variables
		},
		result: {
			data: {
				restoreNodes
			}
		}
	};
}

/**
 * Delete Permanently Mock
 */
export function mockDeletePermanently(
	variables: DeleteNodesMutationVariables,
	deleteNodes: Id[]
): Mock<DeleteNodesMutation, DeleteNodesMutationVariables> {
	return {
		request: {
			query: DELETE_NODES,
			variables
		},
		result: {
			data: {
				deleteNodes
			}
		}
	};
}

/**
 * Update Node Mock
 */
export function mockUpdateNode(
	variables: UpdateNodeMutationVariables,
	updateNode: Node
): Mock<UpdateNodeMutation, UpdateNodeMutationVariables> {
	return {
		request: {
			query: UPDATE_NODE,
			variables: { ...variables, shares_limit: 1 }
		},
		result: {
			data: {
				updateNode
			}
		}
	};
}

export function mockUpdateNodeError(
	variables: UpdateNodeMutationVariables,
	error: ServerError | ApolloError
): Mock<UpdateNodeMutation, UpdateNodeMutationVariables> {
	return {
		request: {
			query: UPDATE_NODE,
			variables: { ...variables, shares_limit: 1 }
		},
		error
	};
}

/**
 * Update Node Description Mock
 */
export function mockUpdateNodeDescription(
	variables: UpdateNodeDescriptionMutationVariables,
	updateNode: Node,
	callback?: () => void
): Mock<UpdateNodeDescriptionMutation, UpdateNodeDescriptionMutationVariables> {
	return {
		request: {
			query: UPDATE_NODE_DESCRIPTION,
			variables
		},
		result: (): { data: UpdateNodeDescriptionMutation } => {
			callback && callback();
			return {
				data: {
					updateNode
				}
			};
		}
	};
}

export function mockUpdateNodeDescriptionError(
	variables: UpdateNodeDescriptionMutationVariables,
	error: ServerError | ApolloError
): Mock<UpdateNodeDescriptionMutation, UpdateNodeDescriptionMutationVariables> {
	return {
		request: {
			query: UPDATE_NODE_DESCRIPTION,
			variables
		},
		error
	};
}

/**
 * Flag Nodes Mock
 */
export function mockFlagNodes(
	variables: FlagNodesMutationVariables,
	flagNodes: Id[]
): Mock<FlagNodesMutation, FlagNodesMutationVariables> {
	return {
		request: {
			query: FLAG_NODES,
			variables
		},
		result: {
			data: {
				flagNodes
			}
		}
	};
}

/**
 * Get Children Mock
 */
export function getChildrenVariables(
	folderId: Id,
	childrenLimit = NODES_LOAD_LIMIT,
	sort = NODES_SORT_DEFAULT,
	sharesLimit = 1,
	withCursor = false
): GetChildrenQueryVariables {
	return {
		node_id: folderId,
		children_limit: childrenLimit,
		sort,
		shares_limit: sharesLimit,
		page_token: withCursor ? 'next_page_token' : undefined
	};
}

export function mockGetChildren(
	variables: GetChildrenQueryVariables,
	getNode: Node
): Mock<GetChildrenQuery, GetChildrenQueryVariables> {
	return {
		request: {
			query: GET_CHILDREN,
			variables
		},
		result: {
			data: {
				getNode
			}
		}
	};
}

export function mockGetChildrenError(
	variables: GetChildrenQueryVariables,
	error: ServerError | ApolloError
): Mock<GetChildrenQuery, GetChildrenQueryVariables> {
	return {
		request: {
			query: GET_CHILDREN,
			variables
		},
		error
	};
}

/**
 * Move Nodes Mock
 */
export function mockMoveNodes(
	variables: MoveNodesMutationVariables,
	moveNodes: Node[],
	callback?: () => void
): Mock<MoveNodesMutation, MoveNodesMutationVariables> {
	return {
		request: {
			query: MOVE_NODES,
			variables
		},
		result: (): { data: MoveNodesMutation } => {
			callback && callback();
			return {
				data: {
					moveNodes
				}
			};
		}
	};
}

/**
 * Copy Nodes Mock
 */
export function mockCopyNodes(
	variables: MoveNodesMutationVariables,
	copyNodes: Node[]
): Mock<CopyNodesMutation, CopyNodesMutationVariables> {
	return {
		request: {
			query: COPY_NODES,
			variables: { ...variables, shares_limit: 1 }
		},
		result: {
			data: {
				copyNodes
			}
		}
	};
}

/**
 * Create Folder Mock
 */
export function mockCreateFolder(
	variables: CreateFolderMutationVariables,
	createFolder: Node
): Mock<CreateFolderMutation, CreateFolderMutationVariables> {
	return {
		request: {
			query: CREATE_FOLDER,
			variables: { ...variables, shares_limit: 1 }
		},
		result: {
			data: {
				createFolder
			}
		}
	};
}

export function mockCreateFolderError(
	variables: CreateFolderMutationVariables,
	error: ServerError | ApolloError
): Mock<CreateFolderMutation, CreateFolderMutationVariables> {
	return {
		request: {
			query: CREATE_FOLDER,
			variables: { ...variables, shares_limit: 1 }
		},
		error
	};
}

/**
 * Get parents mock
 */
export function mockGetParent(
	variables: GetParentQueryVariables,
	node: Node
): Mock<GetParentQuery, GetParentQueryVariables> {
	return {
		request: {
			query: GET_PARENT,
			variables
		},
		result: {
			data: {
				getNode: node
			}
		}
	};
}

/**
 * Get path mock
 */
export function mockGetPath(
	variables: GetPathQueryVariables,
	getPath: Node[]
): Mock<GetPathQuery, GetPathQueryVariables> {
	return {
		request: {
			query: GET_PATH,
			variables
		},
		result: {
			data: {
				getPath
			}
		}
	};
}

/**
 * Get permissions mock
 */
export function mockGetPermissions(
	variables: GetPermissionsQueryVariables,
	node: Node
): Mock<GetPermissionsQuery, GetPermissionsQueryVariables> {
	return {
		request: {
			query: GET_PERMISSIONS,
			variables
		},
		result: {
			data: {
				getNode: node
			}
		}
	};
}

/**
 * Get node mock
 */
export function getNodeVariables(
	nodeId: Id,
	childrenLimit = NODES_LOAD_LIMIT,
	sort = NODES_SORT_DEFAULT,
	sharesLimit = SHARES_LOAD_LIMIT
): GetNodeQueryVariables {
	return {
		node_id: nodeId,
		children_limit: childrenLimit,
		sort,
		shares_limit: sharesLimit
	};
}

export function mockGetNode(
	variables: GetNodeQueryVariables,
	getNode: File | Folder
): Mock<GetNodeQuery, GetNodeQueryVariables> {
	return {
		request: {
			query: GET_NODE,
			variables
		},
		result: {
			data: {
				getNode
			}
		}
	};
}

/**
 * Get shares mock
 */
export function getSharesVariables(
	nodeId: Id,
	sharesLimit = FULL_SHARES_LOAD_LIMIT
): GetSharesQueryVariables {
	return {
		node_id: nodeId,
		shares_limit: sharesLimit
	};
}

export function mockGetShares(
	variables: GetSharesQueryVariables,
	getNode: Node
): Mock<GetSharesQuery, GetSharesQueryVariables> {
	return {
		request: {
			query: GET_SHARES,
			variables
		},
		result: {
			data: {
				getNode
			}
		}
	};
}

/**
 * Get node mock
 */
export function mockGetBaseNode(
	variables: GetBaseNodeQueryVariables,
	getNode: Node
): Mock<GetBaseNodeQuery, GetBaseNodeQueryVariables> {
	return {
		request: {
			query: GET_BASE_NODE,
			variables
		},
		result: {
			data: {
				getNode
			}
		}
	};
}

/**
 * Delete share mock
 */
export function mockDeleteShare(
	variables: DeleteShareMutationVariables,
	deleteShare: boolean
): Mock<DeleteShareMutation, DeleteShareMutationVariables> {
	return {
		request: {
			query: DELETE_SHARE,
			variables
		},
		result: {
			data: {
				deleteShare
			}
		}
	};
}

/**
 * Create share mock
 */
export function mockCreateShare(
	variables: CreateShareMutationVariables,
	createShare: Share,
	callback?: (...args: unknown[]) => void
): Mock<CreateShareMutation, CreateShareMutationVariables> {
	return {
		request: {
			query: CREATE_SHARE,
			variables
		},
		result: (): { data: CreateShareMutation } => {
			callback && callback();
			return {
				data: {
					createShare
				}
			};
		}
	};
}

export function mockCreateShareError(
	variables: CreateShareMutationVariables,
	error: ApolloError | ServerError
): Mock<CreateShareMutation, CreateShareMutationVariables> {
	return {
		request: {
			query: CREATE_SHARE,
			variables
		},
		error
	};
}

/**
 * Create share mock
 */
export function mockUpdateShare(
	variables: UpdateShareMutationVariables,
	updateShare?: Share | null,
	callback?: () => void
): Mock<UpdateShareMutation, UpdateShareMutationVariables> {
	return {
		request: {
			query: UPDATE_SHARE,
			variables
		},
		result: (): { data: UpdateShareMutation } => {
			callback && callback();
			return {
				data: {
					updateShare
				}
			};
		}
	};
}

export function mockUpdateShareError(
	variables: UpdateShareMutationVariables,
	error: ApolloError | ServerError
): Mock<UpdateShareMutation, UpdateShareMutationVariables> {
	return {
		request: {
			query: UPDATE_SHARE,
			variables
		},
		error
	};
}

/**
 * Get account by email mock
 */
export function mockGetAccountByEmail(
	variables: GetAccountByEmailQueryVariables,
	account: QueryType['getAccountByEmail'],
	error?: ApolloError
): Mock<GetAccountByEmailQuery, GetAccountByEmailQueryVariables> {
	return {
		request: {
			query: GET_ACCOUNT_BY_EMAIL,
			variables
		},
		result: {
			data: {
				getAccountByEmail: account
			}
		},
		error
	};
}

export function mockGetAccountsByEmail(
	variables: GetAccountsByEmailQueryVariables,
	accounts: QueryType['getAccountsByEmail'],
	error?: ApolloError
): Mock<GetAccountsByEmailQuery, GetAccountsByEmailQueryVariables> {
	return {
		request: {
			query: GET_ACCOUNTS_BY_EMAIL,
			variables
		},
		result: {
			data: {
				getAccountsByEmail: accounts
			}
		},
		error
	};
}

/**
 * Get Node Links mock
 */
export function mockGetNodeLinks(
	variables: GetNodeLinksQueryVariables,
	node: Node
): Mock<GetNodeLinksQuery, GetNodeLinksQueryVariables> {
	return {
		request: {
			query: GET_NODE_LINKS,
			variables
		},
		result: {
			data: {
				getNode: node
			}
		}
	};
}

/**
 * Get Node Links mock
 */
export function mockGetNodeCollaborationLinks(
	variables: GetNodeCollaborationLinksQueryVariables,
	node: Node,
	collaborationLinks?: Array<Maybe<CollaborationLink>>
): Mock<GetNodeCollaborationLinksQuery, GetNodeCollaborationLinksQueryVariables> {
	return {
		request: {
			query: GET_NODE_COLLABORATION_LINKS,
			variables
		},
		result: {
			data: {
				getNode: {
					...node,
					collaboration_links: collaborationLinks || []
				}
			}
		}
	};
}

/**
 * Create collaboration link mock
 */
export function mockCreateCollaborationLink(
	variables: CreateCollaborationLinkMutationVariables,
	createCollaborationLink: CollaborationLink
): Mock<CreateCollaborationLinkMutation, CreateCollaborationLinkMutationVariables> {
	return {
		request: {
			query: CREATE_COLLABORATION_LINK,
			variables
		},
		result: {
			data: {
				createCollaborationLink
			}
		}
	};
}

/**
 * Delete collaboration links mock
 */
export function mockDeleteCollaborationLinks(
	variables: DeleteCollaborationLinksMutationVariables,
	deleteCollaborationLinks: Array<string>
): Mock<DeleteCollaborationLinksMutation, DeleteCollaborationLinksMutationVariables> {
	return {
		request: {
			query: DELETE_COLLABORATION_LINKS,
			variables
		},
		result: {
			data: {
				deleteCollaborationLinks
			}
		}
	};
}

/**
 * Get File Versions mock
 */
export function mockGetVersions(
	variables: GetVersionsQueryVariables,
	files: File[]
): Mock<GetVersionsQuery, GetVersionsQueryVariables> {
	return {
		request: {
			query: GET_VERSIONS,
			variables
		},
		result: {
			data: {
				getVersions: files
			}
		}
	};
}

/**
 * Delete versions mock
 */
export function mockDeleteVersions(
	variables: DeleteVersionsMutationVariables,
	versions: Array<Maybe<Scalars['Int']>>
): Mock<DeleteVersionsMutation, DeleteVersionsMutationVariables> {
	return {
		request: {
			query: DELETE_VERSIONS,
			variables
		},
		result: {
			data: {
				deleteVersions: versions
			}
		}
	};
}

/**
 * keep versions mock
 */
export function mockKeepVersions(
	variables: KeepVersionsMutationVariables,
	versions: Array<Maybe<Scalars['Int']>>
): Mock<KeepVersionsMutation, KeepVersionsMutationVariables> {
	return {
		request: {
			query: KEEP_VERSIONS,
			variables
		},
		result: {
			data: {
				keepVersions: versions
			}
		}
	};
}

/**
 * Clone version mock
 */
export function mockCloneVersion(
	variables: CloneVersionMutationVariables,
	file: File
): Mock<CloneVersionMutation, CloneVersionMutationVariables> {
	return {
		request: {
			query: CLONE_VERSION,
			variables
		},
		result: {
			data: {
				cloneVersion: file
			}
		}
	};
}

/**
 * Get root list mock
 */
export function mockGetRootsList(): Mock<GetRootsListQuery, GetRootsListQueryVariables> {
	return {
		request: {
			query: GET_ROOTS_LIST,
			variables: {}
		},
		result: {
			data: {
				getRootsList: [
					{ __typename: 'Root', id: ROOTS.LOCAL_ROOT, name: ROOTS.LOCAL_ROOT },
					{ __typename: 'Root', id: ROOTS.TRASH, name: ROOTS.TRASH }
				]
			}
		}
	};
}

export function mockGetConfigs(
	configs: Array<{ name: string; value: string }> = populateConfigs()
): Mock<GetConfigsQuery, GetConfigsQueryVariables> {
	return {
		request: {
			query: GET_CONFIGS,
			variables: {}
		},
		result: {
			data: {
				getConfigs: configs
			}
		}
	};
}

/**
 * Get Child mock
 */

export function mockGetChild(
	variables: GetChildQueryVariables,
	node: GetChildQuery['getNode']
): Mock<GetChildQuery, GetChildQueryVariables> {
	return {
		request: {
			query: GET_CHILD,
			variables: {
				node_id: variables.node_id,
				shares_limit: variables?.shares_limit || 1
			}
		},
		result: {
			data: {
				getNode: node
			}
		}
	};
}

/**
 * Create link mock
 */
export function mockCreateLink(
	variables: CreateLinkMutationVariables,
	link: Link
): Mock<CreateLinkMutation, CreateLinkMutationVariables> {
	return {
		request: {
			query: CREATE_LINK,
			variables
		},
		result: {
			data: {
				createLink: link
			}
		}
	};
}

export function mockCreateLinkError(
	variables: CreateLinkMutationVariables,
	error: ApolloError | ServerError
): Mock<CreateLinkMutation, CreateLinkMutationVariables> {
	return {
		request: {
			query: CREATE_LINK,
			variables
		},
		error
	};
}

/**
 * Update link mock
 */
export function mockUpdateLink(
	variables: UpdateLinkMutationVariables,
	link: Link
): Mock<UpdateLinkMutation, UpdateLinkMutationVariables> {
	return {
		request: {
			query: UPDATE_LINK,
			variables
		},
		result: {
			data: {
				updateLink: link
			}
		}
	};
}

export function mockUpdateLinkError(
	variables: UpdateLinkMutationVariables,
	error: ApolloError | ServerError
): Mock<UpdateLinkMutation, UpdateLinkMutationVariables> {
	return {
		request: {
			query: UPDATE_LINK,
			variables
		},
		error
	};
}
