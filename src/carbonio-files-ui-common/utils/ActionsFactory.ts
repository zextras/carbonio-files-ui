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
import { Action, GetNodeParentType, Node } from '../types/common';
import { UploadItem, UploadStatus } from '../types/graphql/client-types';
import { File as FilesFile, Folder, Permissions, Root } from '../types/graphql/types';
import { DeepPick, MakeOptional, OneOrMany } from '../types/utils';

export type ActionsFactoryNodeType = Pick<
	Node,
	'permissions' | 'flagged' | 'type' | 'owner' | 'id' | 'rootId'
> &
	GetNodeParentType &
	(Pick<FilesFile, '__typename'> | Pick<Folder, '__typename'>) &
	MakeOptional<Pick<FilesFile, 'mime_type'>, 'mime_type'>;

export type ActionsFactoryUploadItem = Pick<
	Partial<UploadItem>,
	'status' | 'parentNodeId' | 'nodeId'
>;

export type ActionsFactoryGlobalType = ActionsFactoryNodeType | ActionsFactoryUploadItem;

export type ActionsFactoryChecker = (nodes: ActionsFactoryGlobalType[]) => boolean;

export type ActionsFactoryCheckerMap = Partial<Record<Action, ActionsFactoryChecker>>;

const hoverBarActions: Action[] = [
	Action.SendViaMail,
	Action.Download,
	Action.ManageShares,
	Action.Flag,
	Action.UnFlag,
	Action.Restore,
	Action.DeletePermanently
];

const completeListActions: Action[] = [
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
];

const uploadActions: Action[] = [Action.RemoveUpload, Action.RetryUpload, Action.GoToFolder];

export function isRoot(node: { __typename?: string }): node is Root {
	return node.__typename === 'Root';
}

export function hasWritePermission(
	nodes: OneOrMany<
		| (Pick<ActionsFactoryNodeType, '__typename'> &
				DeepPick<ActionsFactoryNodeType, 'permissions', 'can_write_file' | 'can_write_folder'>)
		| ActionsFactoryUploadItem
	>,
	actionName: string
): boolean {
	if (nodes instanceof Array) {
		return nodes.every((node) => hasWritePermission(node, actionName));
	}
	if (!('__typename' in nodes)) {
		throw Error(`cannot evaluate ${actionName} on UnknownType`);
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

type ArgsType = {
	nodes: OneOrMany<ActionsFactoryGlobalType>;
	canUsePreview?: boolean;
	canUseDocs?: boolean;
};

export function canRename({ nodes }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canRename on Node type');
	}
	if (nodes.length === 0) {
		throw Error('cannot evaluate canRename on empty nodes array');
	}
	if (nodes.length > 1) {
		// cannot rename more than one node
		return false;
	}
	// so size(nodes) is 1
	const node = nodes[0];
	return hasWritePermission(node, 'canRename') && 'rootId' in node && node.rootId !== ROOTS.TRASH;
}

export function canFlag({ nodes }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canFlag on Node type');
	}
	if (nodes.length === 0) {
		throw Error('cannot evaluate canFlag on empty nodes array');
	}
	const notTrashedNodes = nodes.every((node) => 'rootId' in node && node.rootId !== ROOTS.TRASH);
	if (!notTrashedNodes) {
		return false;
	}
	if (nodes.length > 1) {
		// can flag if there is at least 1 unflagged node
		return nodes.some((node) => 'flagged' in node && !node.flagged);
	}
	// so size(nodes) is 1
	const node = nodes[0];
	return 'flagged' in node && !node.flagged;
}

export function canUnFlag({ nodes }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canUnFlag on Node type');
	}
	if (nodes.length === 0) {
		throw Error('cannot evaluate canUnFlag on empty nodes array');
	}
	const notTrashedNodes = nodes.every((node) => 'rootId' in node && node.rootId !== ROOTS.TRASH);
	if (!notTrashedNodes) {
		return false;
	}
	if (nodes.length > 1) {
		// can unflag if there is at least 1 flagged node
		return nodes.some((node) => 'flagged' in node && node.flagged);
	}
	// so size(nodes) is 1
	const node = nodes[0];
	return ('flagged' in node && node.flagged) ?? false;
}

export function canCreateFolder(
	destinationNode: Pick<ActionsFactoryNodeType, '__typename' | 'permissions'>
): boolean {
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

export function canCreateFile(
	destinationNode: Pick<ActionsFactoryNodeType, '__typename' | 'permissions'>
): boolean {
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

export function canUploadFile(
	destinationNode: Pick<ActionsFactoryNodeType, '__typename' | 'permissions'>
): boolean {
	return canCreateFile(destinationNode);
}

export function canBeWriteNodeDestination(
	destinationNode: Pick<ActionsFactoryNodeType, '__typename' | 'permissions'>,
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

export function canBeCopyDestination(
	destinationNode: Pick<ActionsFactoryNodeType, '__typename' | 'permissions' | 'id'>,
	nodesToCopy: Array<Pick<ActionsFactoryNodeType, '__typename' | 'id'>>
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

export function canRestore({ nodes }: ArgsType): boolean {
	let someNotTrashed: boolean;
	if (nodes instanceof Array) {
		someNotTrashed = nodes.some((node) => 'rootId' in node && node.rootId !== ROOTS.TRASH);
	} else {
		someNotTrashed = 'rootId' in nodes && nodes.rootId === ROOTS.TRASH;
	}
	return hasWritePermission(nodes, 'canRestore') && !someNotTrashed;
}

export function canMarkForDeletion({ nodes }: ArgsType): boolean {
	let someTrashed: boolean;
	if (nodes instanceof Array) {
		someTrashed = nodes.some((node) => 'rootId' in node && node.rootId === ROOTS.TRASH);
	} else {
		someTrashed = 'rootId' in nodes && nodes.rootId === ROOTS.TRASH;
	}
	return hasWritePermission(nodes, 'canMarkForDeletion') && !someTrashed;
}

export function canUpsertDescription({ nodes }: ArgsType): boolean {
	return hasWritePermission(nodes, 'canUpsertDescription');
}

export function canDeletePermanently({ nodes }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		if ('__typename' in nodes && (isFile(nodes) || isFolder(nodes))) {
			if (nodes.permissions.can_delete === undefined || nodes.permissions.can_delete === null) {
				throw Error('can_delete not defined');
			}
			return nodes.permissions.can_delete && nodes.rootId === ROOTS.TRASH;
		}
		throw Error(`cannot evaluate DeletePermanently on UnknownType`);
	} else {
		return nodes.every((node) => canDeletePermanently({ nodes: node }));
	}
}

type NodeMove = DeepPick<Node, 'permissions', 'can_write_file' | 'can_write_folder'> &
	DeepPick<Node, 'parent', 'id' | 'permissions'> &
	Pick<Node, 'rootId'> &
	DeepPick<Node, 'owner', 'id'>;
function canMoveCommonCriteria(
	node: NodeMove,
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

type ActionMoveNodeType = Pick<
	ActionsFactoryNodeType,
	'__typename' | 'id' | 'rootId' | 'permissions' | 'parent' | 'owner'
>;

export function canMove({
	nodes
}: {
	nodes: OneOrMany<ActionMoveNodeType | ActionsFactoryUploadItem>;
}): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canMove on Node type');
	}
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

export function canBeMoveDestination(
	destinationNode: Pick<
		ActionsFactoryNodeType,
		'__typename' | 'permissions' | 'id' | 'owner' | 'parent' | 'rootId'
	>,
	nodesToMove: ActionMoveNodeType[]
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

export function canCopy({ nodes }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canCopy on Node type');
	}
	if (nodes.length === 0) {
		throw Error('cannot evaluate canCopy on empty nodes array');
	}
	return nodes.every((node) => 'rootId' in node && node.rootId !== ROOTS.TRASH);
}

export function canDownload({ nodes }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canDownload on Node type');
	}
	if (nodes.length === 0) {
		throw Error('cannot evaluate canDownload on empty nodes array');
	}
	const node = nodes[0];
	return nodes.length === 1 && '__typename' in node && isFile(node) && node.rootId !== ROOTS.TRASH;
}

export function canOpenWithDocs({ nodes, canUseDocs }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canOpenWithDocs on Node type');
	}
	if (nodes.length === 0) {
		throw Error('cannot evaluate canOpenWithDocs on empty nodes array');
	}
	const node = nodes[0];
	return (
		!!canUseDocs &&
		nodes.length === 1 &&
		'__typename' in node &&
		isFile(node) &&
		docsHandledMimeTypes.includes(node.mime_type) &&
		node.rootId !== ROOTS.TRASH &&
		!node.permissions.can_write_file &&
		node.permissions.can_read
	);
}

export function canOpenVersionWithDocs({ nodes, canUseDocs }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canOpenWithDocs on Node type');
	}
	if (nodes.length === 0) {
		throw Error('cannot evaluate canOpenWithDocs on empty nodes array');
	}
	const node = nodes[0];
	return (
		!!canUseDocs &&
		nodes.length === 1 &&
		'__typename' in node &&
		isFile(node) &&
		docsHandledMimeTypes.includes(node.mime_type) &&
		node.rootId !== ROOTS.TRASH
	);
}

export function canEdit({
	nodes,
	canUseDocs
}: {
	nodes: OneOrMany<
		| (Pick<ActionsFactoryNodeType, '__typename' | 'mime_type' | 'rootId'> &
				DeepPick<Node, 'permissions', 'can_write_file'>)
		| ActionsFactoryUploadItem
	>;
	canUseDocs?: ArgsType['canUseDocs'];
}): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canEdit on Node type');
	}
	if (nodes.length === 0) {
		throw Error('cannot evaluate canEdit on empty nodes array');
	}
	const node = nodes[0];
	return (
		!!canUseDocs &&
		nodes.length === 1 &&
		'__typename' in node &&
		isFile(node) &&
		docsHandledMimeTypes.includes(node.mime_type) &&
		node.rootId !== ROOTS.TRASH &&
		node.permissions.can_write_file
	);
}

export function canPreview({ nodes, canUseDocs, canUsePreview }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canPreview on Node type');
	}
	if (nodes.length === 0) {
		throw Error('cannot evaluate canPreview on empty nodes array');
	}
	const node = nodes[0];
	return (
		nodes.length === 1 &&
		'__typename' in node &&
		isFile(node) &&
		node.rootId !== ROOTS.TRASH &&
		isSupportedByPreview(node.mime_type, 'preview')[0] &&
		!!canUsePreview &&
		(!isPreviewDependantOnDocs(node.mime_type) || !!canUseDocs)
	);
}

export function canRemoveUpload({ nodes }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canRemoveUpload on Node type');
	}
	if (nodes.length === 0) {
		throw Error('cannot evaluate canRemoveUpload on empty nodes array');
	}
	return true;
}

export function canRetryUpload({ nodes }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canRetryUpload on Node type');
	}
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

export function canGoToFolder({ nodes }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canGoToFolder on Node type');
	}
	if (nodes.length === 0) {
		throw Error('cannot evaluate canGoToFolder on empty nodes array');
	}
	// can go to folder only if all selected nodes have the same parent
	return nodes.every(
		(node, _index, array) =>
			'parentNodeId' in node &&
			node.parentNodeId &&
			'parentNodeId' in array[0] &&
			array[0].parentNodeId &&
			node.parentNodeId === array[0].parentNodeId
	);
}

export function canSendViaMail({ nodes }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canSendViaMail on Node type');
	}
	if (nodes.length === 0) {
		throw Error('cannot evaluate canSendViaMail on empty nodes array');
	}

	const node = nodes[0];
	return nodes.length === 1 && '__typename' in node && isFile(node) && node.rootId !== ROOTS.TRASH;
}

export function canManageShares({ nodes }: ArgsType): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canManageShares on Node type');
	}
	if (nodes.length === 0) {
		throw Error('cannot evaluate canManageShares on empty nodes array');
	}
	return nodes.length === 1 && 'rootId' in nodes[0] && nodes[0].rootId !== ROOTS.TRASH;
}

const actionsCheckMap: { [key in Action]: (args: ArgsType) => boolean } = {
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
};

export function getPermittedActions(
	nodes: ActionsFactoryGlobalType[],
	actions: Action[],
	// TODO: REMOVE CHECK ON ROOT WHEN BE WILL NOT RETURN LOCAL_ROOT AS PARENT FOR SHARED NODES
	canUsePreview?: boolean,
	canUseDocs?: boolean,
	customCheckers?: ActionsFactoryCheckerMap
): Action[] {
	return actions.reduce<Action[]>((accumulator, action) => {
		if (nodes.length > 0) {
			let externalCheckerResult = true;
			const externalChecker = customCheckers?.[action];
			if (externalChecker) {
				externalCheckerResult = externalChecker(nodes);
			}
			if (actionsCheckMap[action]({ nodes, canUsePreview, canUseDocs }) && externalCheckerResult) {
				accumulator.push(action);
			}
		}
		return accumulator;
	}, []);
}

export function getAllPermittedActions(
	nodes: ActionsFactoryNodeType[],
	// TODO: REMOVE CHECK ON ROOT WHEN BE WILL NOT RETURN LOCAL_ROOT AS PARENT FOR SHARED NODES
	canUsePreview?: boolean,
	canUseDocs?: boolean,
	customCheckers?: ActionsFactoryCheckerMap
): Action[] {
	return getPermittedActions(nodes, completeListActions, canUsePreview, canUseDocs, customCheckers);
}

export function getPermittedHoverBarActions(node: ActionsFactoryNodeType): Action[] {
	return getPermittedActions([node], hoverBarActions);
}

export function getPermittedUploadActions(
	nodes: ActionsFactoryUploadItem[],
	customCheckers?: ActionsFactoryCheckerMap
): Action[] {
	return getPermittedActions(nodes, uploadActions, undefined, undefined, customCheckers);
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
