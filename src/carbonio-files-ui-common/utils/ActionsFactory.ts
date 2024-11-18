/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Action as DSAction } from '@zextras/carbonio-design-system';

import { isPreviewDependantOnDocs, isSupportedByPreview } from './previewUtils';
import { docsHandledMimeTypes, isFile, isFolder } from './utils';
import { getUserAccount } from '../../utils/utils';
import { ROOTS } from '../constants';
import { Node } from '../types/common';
import { UploadItem, UploadStatus } from '../types/graphql/client-types';
import { NodeType, Permissions, Root } from '../types/graphql/types';
import { DeepPick, OneOrMany } from '../types/utils';

export const Action = {
	Edit: 'EDIT',
	Preview: 'PREVIEW',
	SendViaMail: 'SEND_VIA_MAIL',
	Download: 'DOWNLOAD',
	ManageShares: 'MANAGE_SHARES',
	Flag: 'FLAG',
	UnFlag: 'UNFLAG',
	OpenWithDocs: 'OPEN_WITH_DOCS',
	Copy: 'COPY',
	Move: 'MOVE',
	Rename: 'RENAME',
	MoveToTrash: 'MOVE_TO_TRASH',
	Restore: 'RESTORE',
	DeletePermanently: 'DELETE_PERMANENTLY',
	UpsertDescription: 'UPSERT_DESCRIPTION',
	RemoveUpload: 'REMOVE_UPLOAD',
	RetryUpload: 'RETRY_UPLOAD',
	GoToFolder: 'GO_TO_FOLDER'
} as const;

export type Action = (typeof Action)[keyof typeof Action];

const hoverBarActions = [
	Action.SendViaMail,
	Action.Download,
	Action.ManageShares,
	Action.Flag,
	Action.UnFlag,
	Action.Restore,
	Action.DeletePermanently
] as const satisfies Action[];

const completeListActionsForNode = [
	Action.Edit,
	Action.Preview,
	Action.SendViaMail,
	Action.Download,
	Action.ManageShares,
	Action.Flag,
	Action.UnFlag,
	Action.OpenWithDocs,
	Action.Copy,
	Action.Move,
	Action.Rename,
	Action.MoveToTrash,
	Action.Restore,
	Action.DeletePermanently
] as const satisfies Action[];

const uploadActions = [
	Action.RemoveUpload,
	Action.RetryUpload,
	Action.GoToFolder
] as const satisfies Action[];

export function isRoot<T extends { __typename?: string }>(
	node: T
): node is T & Required<Pick<Root, '__typename'>> {
	return node.__typename === 'Root';
}

type NodeWritePermissions = Node<'permissions'>;
export function hasWritePermission(
	nodes: OneOrMany<NodeWritePermissions>,
	actionName: string
): boolean {
	if (nodes instanceof Array) {
		return nodes.every((node) => hasWritePermission(node, actionName));
	}

	if (isFile(nodes)) {
		if (
			nodes.permissions.can_write_file === undefined ||
			nodes.permissions.can_write_file === null
		) {
			throw Error('can_write_file not defined');
		}
		return nodes.permissions.can_write_file;
	}
	if (isFolder(nodes)) {
		if (
			nodes.permissions.can_write_folder === undefined ||
			nodes.permissions.can_write_folder === null
		) {
			throw Error('can_write_folder not defined');
		}
		return nodes.permissions.can_write_folder;
	}
	throw Error(`cannot evaluate ${actionName} on UnknownType`);
}

type NodeRename = Node<'rootId'> & NodeWritePermissions;
export function canRename({ nodes }: { nodes: NodeRename[] }): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canRename on empty nodes array');
	}
	if (nodes.length > 1) {
		// cannot rename more than one node
		return false;
	}
	// so size(nodes) is 1
	const node = nodes[0];
	return hasWritePermission(node, 'canRename') && node.rootId !== ROOTS.TRASH;
}

type NodeFlag = Node<'flagged' | 'rootId'>;
export function canFlag({ nodes }: { nodes: NodeFlag[] }): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canFlag on empty nodes array');
	}
	const notTrashedNodes = nodes.every((node) => node.rootId !== ROOTS.TRASH);
	if (!notTrashedNodes) {
		return false;
	}
	if (nodes.length > 1) {
		// can flag if there is at least 1 unflagged node
		return nodes.some((node) => !node.flagged);
	}
	// so size(nodes) is 1
	const node = nodes[0];
	return !node.flagged;
}

type NodeUnFlag = Node<'flagged' | 'rootId'>;
export function canUnFlag({ nodes }: { nodes: NodeUnFlag[] }): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canUnFlag on empty nodes array');
	}
	const notTrashedNodes = nodes.every((node) => node.rootId !== ROOTS.TRASH);
	if (!notTrashedNodes) {
		return false;
	}
	if (nodes.length > 1) {
		// can unflag if there is at least 1 flagged node
		return nodes.some((node) => node.flagged);
	}
	// so size(nodes) is 1
	const node = nodes[0];
	return node.flagged;
}

type NodeCreateFolder = Node<'permissions'>;
export function canCreateFolder(destinationNode: NodeCreateFolder): boolean {
	if (isFile(destinationNode)) {
		throw Error('destinationNode must be a Folder');
	}
	if (
		destinationNode.permissions.can_write_folder === undefined ||
		destinationNode.permissions.can_write_folder === null
	) {
		throw Error('can_write_folder not defined');
	}
	return destinationNode.permissions.can_write_folder;
}

type NodeCreateFile = Node<'permissions'>;
export function canCreateFile(destinationNode: NodeCreateFile): boolean {
	if (isFile(destinationNode)) {
		throw Error('destinationNode must be a Folder');
	}
	if (
		destinationNode.permissions.can_write_file === undefined ||
		destinationNode.permissions.can_write_file === null
	) {
		throw Error('can_write_file not defined');
	}
	return destinationNode.permissions.can_write_file;
}

export function canUploadFile(destinationNode: NodeCreateFile): boolean {
	return canCreateFile(destinationNode);
}

type NodeWriteDestination = NodeCreateFolder & NodeCreateFile;
export function canBeWriteNodeDestination(
	destinationNode: NodeWriteDestination,
	writingFile: boolean,
	writingFolder: boolean
): boolean {
	// a node can be the destination of a write action if and only if
	// - is a folder
	// - has can_write_file permission if user is writing at least one file
	// - has can_write_folder permission if user is writing at least one folder

	return (
		isFolder(destinationNode) &&
		!(writingFile && !canCreateFile(destinationNode)) &&
		!(writingFolder && !canCreateFolder(destinationNode))
	);
}

type NodeCopyDestination = NodeWriteDestination & Node<'id'>;
export function canBeCopyDestination(
	destinationNode: NodeCopyDestination,
	nodesToCopy: Node<'id'>[]
): boolean {
	const copyingFile = nodesToCopy.some((node) => isFile(node));
	const copyingFolder = nodesToCopy.some((node) => isFolder(node));
	// a node can be de destination of a copy action if and only if
	// - has permission to write nodes in it
	// - is not one of the copying nodes (cannot copy a folder inside itself)
	return (
		canBeWriteNodeDestination(destinationNode, copyingFile, copyingFolder) &&
		nodesToCopy.every((node) => node.id !== destinationNode.id)
	);
}

type NodeRestore = NodeWritePermissions & Node<'rootId'>;
export function canRestore({ nodes }: { nodes: NodeRestore[] }): boolean {
	const someNotTrashed = nodes.some((node) => node.rootId !== ROOTS.TRASH);
	return hasWritePermission(nodes, 'canRestore') && !someNotTrashed;
}

type NodeMarkForDeletion = NodeWritePermissions & Node<'rootId'>;
export function canMarkForDeletion({ nodes }: { nodes: NodeMarkForDeletion[] }): boolean {
	const someTrashed = nodes.some((node) => node.rootId === ROOTS.TRASH);
	return hasWritePermission(nodes, 'canMarkForDeletion') && !someTrashed;
}

export function canUpsertDescription({ nodes }: { nodes: NodeWritePermissions[] }): boolean {
	return hasWritePermission(nodes, 'canUpsertDescription');
}

type NodeDeletePermanently = Node<'rootId' | 'permissions'>;
export function canDeletePermanently({ nodes }: { nodes: NodeDeletePermanently[] }): boolean {
	return nodes.every((node) => {
		if (isFile(node) || isFolder(node)) {
			if (node.permissions.can_delete === undefined || node.permissions.can_delete === null) {
				throw Error('can_delete not defined');
			}
			return node.permissions.can_delete && node.rootId === ROOTS.TRASH;
		}
		throw Error(`cannot evaluate DeletePermanently on UnknownType`);
	});
}

type NodeMoveCommon = Node<'rootId' | 'permissions'> &
	DeepPick<Node<'parent'>, 'parent', 'id' | 'permissions'> &
	DeepPick<Node<'owner'>, 'owner', 'id'>;
function canMoveCommonCriteria(
	node: NodeMoveCommon,
	permission: keyof Pick<Permissions, 'can_write_file' | 'can_write_folder'>
): boolean {
	const loggedUserId = getUserAccount().id;
	// - a folder can be moved if it has can_write_folder permission, and it has a parent which has can_write_folder permission
	// - a file can be moved if it has can_write_file permission, and it has a parent which has can_write_file permission.
	// - if a node is shared with me and its parent is the LOCAL_ROOT, then the node cannot be moved (it's a direct share)
	// - a trashed node cannot be moved
	return (
		node.permissions[permission] &&
		!!node.parent &&
		// TODO: REMOVE CHECK ON ROOT WHEN BE WILL NOT RETURN LOCAL_ROOT AS PARENT FOR SHARED NODES
		(node.parent.id !== ROOTS.LOCAL_ROOT || node.owner?.id === loggedUserId) &&
		node.parent.permissions[permission] &&
		node.rootId !== ROOTS.TRASH
	);
}

type NodeMove = NodeMoveCommon & Node<'id'>;
export function canMove({ nodes }: { nodes: NodeMove[] }): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canMove on empty nodes array');
	}
	return nodes.every((node) => {
		if ('__typename' in node && isFile(node)) {
			if (
				node.permissions.can_write_file === undefined ||
				node.permissions.can_write_file === null
			) {
				throw Error('can_write_file not defined');
			}
			return canMoveCommonCriteria(node, 'can_write_file');
		}
		if ('__typename' in node && isFolder(node)) {
			if (
				node.permissions.can_write_folder === undefined ||
				node.permissions.can_write_folder === null
			) {
				throw Error('can_write_folder not defined');
			}
			return canMoveCommonCriteria(node, 'can_write_folder');
		}
		throw Error('cannot evaluate canMove on UnknownType');
	});
}

type NodeMoveDestination = NodeWriteDestination &
	Node<'id' | 'rootId'> &
	DeepPick<Node<'owner'>, 'owner', 'id'>;
export function canBeMoveDestination(
	destinationNode: NodeMoveDestination,
	nodesToMove: NodeMove[]
): boolean {
	const loggedUserId = getUserAccount().id;
	const movingFile = nodesToMove.some((node) => isFile(node));
	const movingFolder = nodesToMove.some((node) => isFolder(node));
	// a node can be de destination of a move action if and only if
	// - has permission to write nodes in it
	// - is not one of the moving nodes (cannot move a folder inside itself)
	// - has the same owner of the files that are written (workspace concept)
	// - is not trashed
	const destinationOwnerId = destinationNode.owner?.id ?? loggedUserId;
	const isSameOwner = nodesToMove.every((node) => node.owner?.id === destinationOwnerId);
	return (
		canMove({ nodes: nodesToMove }) &&
		canBeWriteNodeDestination(destinationNode, movingFile, movingFolder) &&
		nodesToMove.every((node) => node.id !== destinationNode.id) &&
		isSameOwner &&
		destinationNode.rootId !== ROOTS.TRASH
	);
}

type NodeCopy = Node<'rootId'>;
export function canCopy({ nodes }: { nodes: NodeCopy[] }): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canCopy on empty nodes array');
	}
	return nodes.every((node) => node.rootId !== ROOTS.TRASH);
}

type NodeDownload = Node<'rootId'>;
export function canDownload({ nodes }: { nodes: NodeDownload[] }): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canDownload on empty nodes array');
	}
	const node = nodes[0];
	return nodes.length === 1 && isFile(node) && node.rootId !== ROOTS.TRASH;
}

type NodeOpenWithDocs = Node<'rootId' | 'permissions', 'mime_type'>;
export function canOpenWithDocs({
	nodes,
	canUseDocs = false
}: {
	nodes: NodeOpenWithDocs[];
	canUseDocs?: boolean;
}): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canOpenWithDocs on empty nodes array');
	}
	const node = nodes[0];
	return (
		canUseDocs &&
		nodes.length === 1 &&
		isFile(node) &&
		docsHandledMimeTypes.includes(node.mime_type) &&
		node.rootId !== ROOTS.TRASH &&
		!node.permissions.can_write_file &&
		node.permissions.can_read
	);
}

type NodeOpenVersion = Node<'rootId', 'mime_type'>;
export function canOpenVersionWithDocs({
	nodes,
	canUseDocs = false
}: {
	nodes: NodeOpenVersion[];
	canUseDocs?: boolean;
}): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canOpenWithDocs on empty nodes array');
	}
	const node = nodes[0];
	return (
		canUseDocs &&
		nodes.length === 1 &&
		isFile(node) &&
		docsHandledMimeTypes.includes(node.mime_type) &&
		node.rootId !== ROOTS.TRASH
	);
}

type NodeEdit = Node<'rootId', 'mime_type' | 'permissions'>;
export function canEdit({
	nodes,
	canUseDocs = false
}: {
	nodes: NodeEdit[];
	canUseDocs?: boolean;
}): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canEdit on empty nodes array');
	}
	const node = nodes[0];
	return (
		canUseDocs &&
		nodes.length === 1 &&
		isFile(node) &&
		docsHandledMimeTypes.includes(node.mime_type) &&
		node.rootId !== ROOTS.TRASH &&
		node.permissions.can_write_file
	);
}

type NodePreview = Node<'rootId' | 'type', 'mime_type'>;
export function canPreview({
	nodes,
	canUseDocs = false,
	canUsePreview = false
}: {
	nodes: NodePreview[];
	canUseDocs?: boolean;
	canUsePreview?: boolean;
}): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canPreview on empty nodes array');
	}
	const node = nodes[0];
	return (
		nodes.length === 1 &&
		isFile(node) &&
		node.rootId !== ROOTS.TRASH &&
		((isSupportedByPreview(node.mime_type, 'preview')[0] &&
			canUsePreview &&
			(!isPreviewDependantOnDocs(node.mime_type) || canUseDocs)) ||
			node.type === NodeType.Video)
	);
}

type UploadRemove = Partial<UploadItem>;
export function canRemoveUpload({ nodes }: { nodes: UploadRemove[] }): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canRemoveUpload on empty nodes array');
	}
	return true;
}

type UploadRetry = Pick<UploadItem, 'status' | 'parentNodeId'>;
export function canRetryUpload({ nodes }: { nodes: UploadRetry[] }): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canRetryUpload on empty nodes array');
	}
	// can retry only if all selected nodes are failed
	return nodes.every(
		(node) =>
			'status' in node &&
			node.status === UploadStatus.FAILED &&
			node.parentNodeId !== undefined &&
			node.parentNodeId !== null
	);
}

type UploadGoToFolder = Pick<UploadItem, 'parentNodeId'>;
export function canGoToFolder({ nodes }: { nodes: UploadGoToFolder[] }): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canGoToFolder on empty nodes array');
	}
	// can go to folder only if all selected nodes have the same parent
	return nodes.every(
		(node, _index, array) =>
			node.parentNodeId && array[0].parentNodeId && node.parentNodeId === array[0].parentNodeId
	);
}
type NodeSendViaMail = Node<'rootId'>;
export function canSendViaMail({ nodes }: { nodes: NodeSendViaMail[] }): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canSendViaMail on empty nodes array');
	}

	const node = nodes[0];
	return nodes.length === 1 && isFile(node) && node.rootId !== ROOTS.TRASH;
}

type NodeManageShares = Node<'rootId'>;
export function canManageShares({ nodes }: { nodes: NodeManageShares[] }): boolean {
	if (nodes.length === 0) {
		throw Error('cannot evaluate canManageShares on empty nodes array');
	}
	return nodes.length === 1 && nodes[0].rootId !== ROOTS.TRASH;
}

const ACTION_HANDLERS = {
	[Action.Edit]: canEdit,
	[Action.Preview]: canPreview,
	[Action.SendViaMail]: canSendViaMail,
	[Action.Download]: canDownload,
	[Action.ManageShares]: canManageShares,
	[Action.Flag]: canFlag,
	[Action.UnFlag]: canUnFlag,
	[Action.OpenWithDocs]: canOpenWithDocs,
	[Action.Copy]: canCopy,
	[Action.Move]: canMove,
	[Action.Rename]: canRename,
	[Action.MoveToTrash]: canMarkForDeletion,
	[Action.Restore]: canRestore,
	[Action.DeletePermanently]: canDeletePermanently,
	[Action.UpsertDescription]: canUpsertDescription,
	[Action.GoToFolder]: canGoToFolder,
	[Action.RetryUpload]: canRetryUpload,
	[Action.RemoveUpload]: canRemoveUpload
} as const;

type ActionHandlers = typeof ACTION_HANDLERS;

type ArgsForHandler<TAction extends keyof ActionHandlers> = ActionHandlers[TAction] extends (
	args: infer TArgs
) => void
	? TArgs
	: never;

type IntersectArgs<TActions extends (keyof ActionHandlers)[]> = TActions extends [
	infer FirstAction extends keyof ActionHandlers,
	...infer RestActions extends (keyof ActionHandlers)[]
]
	? ArgsForHandler<FirstAction> & IntersectArgs<RestActions>
	: unknown;

type AtLeastOneAction<TActions extends (keyof ActionHandlers)[]> = [TActions[number], ...TActions];

type CustomCheckers<TActions extends (keyof ActionHandlers)[]> = {
	[K in keyof ActionHandlers]?: K extends TActions[number]
		? (nodes: Parameters<ActionHandlers[K]>[0]['nodes']) => boolean
		: never;
};

export type CustomUploadCheckers = CustomCheckers<typeof uploadActions>;

export function getPermittedActions<TActions extends AtLeastOneAction<(keyof ActionHandlers)[]>>(
	actions: TActions,
	{ nodes, ...rest }: IntersectArgs<TActions>,
	customCheckers?: CustomCheckers<TActions>
): Action[] {
	return actions.reduce<Action[]>((accumulator, action) => {
		if (nodes.length > 0) {
			let externalCheckerResult = true;
			const externalChecker = customCheckers?.[action];
			if (externalChecker) {
				externalCheckerResult = externalChecker(nodes);
			}
			if (ACTION_HANDLERS[action]({ nodes, ...rest }) && externalCheckerResult) {
				accumulator.push(action);
			}
		}
		return accumulator;
	}, []);
}

export function getAllPermittedActions(
	args: IntersectArgs<typeof completeListActionsForNode>,
	customCheckers?: CustomCheckers<typeof completeListActionsForNode>
): Action[] {
	return getPermittedActions(completeListActionsForNode, args, customCheckers);
}

export function getPermittedHoverBarActions(
	node: IntersectArgs<typeof hoverBarActions>['nodes'][number]
): Action[] {
	return getPermittedActions(hoverBarActions, { nodes: [node] });
}

export function getPermittedUploadActions(
	nodes: IntersectArgs<typeof uploadActions>['nodes'],
	customCheckers?: CustomCheckers<typeof uploadActions>
): Action[] {
	return getPermittedActions(uploadActions, { nodes }, customCheckers);
}

export function buildActionItems(
	itemsMap: Partial<Record<Action, DSAction>>,
	actions: Action[] = []
): DSAction[] {
	return actions.reduce<DSAction[]>((accumulator, action): DSAction[] => {
		const actionItem = itemsMap[action];
		if (actionItem) {
			accumulator.push(actionItem);
		}
		return accumulator;
	}, []);
}
