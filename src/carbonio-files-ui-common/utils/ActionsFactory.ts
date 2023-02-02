/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Action as DSAction } from '@zextras/carbonio-design-system';
import { forEach, find, includes, reduce, size, some, every, isBoolean } from 'lodash';

import { ACTIONS_TO_REMOVE_DUE_TO_PRODUCT_CONTEXT } from '../../constants';
import { ROOTS } from '../constants';
import { Action, GetNodeParentType, Node } from '../types/common';
import { UploadItem, UploadStatus } from '../types/graphql/client-types';
import { File as FilesFile, Folder, MakeOptional, Root } from '../types/graphql/types';
import { OneOrMany } from '../types/utils';
import { docsHandledMimeTypes, isFile, isFolder, isSupportedByPreview } from './utils';

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
	nodes: OneOrMany<ActionsFactoryNodeType>,
	actionName: string
): boolean {
	if (!(nodes instanceof Array)) {
		if (isFile(nodes)) {
			if (!isBoolean(nodes.permissions.can_write_file)) {
				throw Error('can_write_file not defined');
			}
			return nodes.permissions.can_write_file;
		}
		if (isFolder(nodes)) {
			if (!isBoolean(nodes.permissions.can_write_folder)) {
				throw Error('can_write_folder not defined');
			}
			return nodes.permissions.can_write_folder;
		}
		throw Error(`cannot evaluate ${actionName} on UnknownType`);
	} else {
		let result = true;
		// eslint-disable-next-line consistent-return
		forEach(nodes, (node: ActionsFactoryNodeType) => {
			const partial = hasWritePermission(node, actionName);
			if (!partial) {
				result = false;
				return false;
			}
		});
		return result;
	}
}

export function canRename(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canRename on Node type');
	}
	const $nodes = nodes as ActionsFactoryNodeType[];
	if (size($nodes) === 0) {
		throw Error('cannot evaluate canRename on empty nodes array');
	}
	if (size($nodes) > 1) {
		// cannot rename more than one node
		return false;
	}
	// so size(nodes) is 1
	return hasWritePermission($nodes, 'canRename') && $nodes[0].rootId !== ROOTS.TRASH;
}

export function canFlag(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canFlag on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canFlag on empty nodes array');
	}
	const $nodes = nodes as ActionsFactoryNodeType[];
	const notTrashedNodes = every($nodes, (node) => node.rootId !== ROOTS.TRASH);
	if (!notTrashedNodes) {
		return false;
	}
	if (size($nodes) > 1) {
		// can flag if there is at least 1 unflagged node
		return find($nodes, (node) => !node.flagged) !== undefined;
	}
	// so size(nodes) is 1
	return !$nodes[0].flagged;
}

export function canUnFlag(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canUnFlag on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canUnFlag on empty nodes array');
	}
	const $nodes = nodes as ActionsFactoryNodeType[];
	const notTrashedNodes = every($nodes, (node) => node.rootId !== ROOTS.TRASH);
	if (!notTrashedNodes) {
		return false;
	}
	if (size($nodes) > 1) {
		// can unflag if there is at least 1 flagged node
		return find($nodes, (node) => node.flagged) !== undefined;
	}
	// so size(nodes) is 1
	return $nodes[0].flagged;
}

export function canCreateFolder(
	destinationNode: Pick<ActionsFactoryNodeType, '__typename' | 'permissions'>
): boolean {
	if (isFile(destinationNode)) {
		throw Error('destinationNode must be a Folder');
	}
	if (!isBoolean(destinationNode.permissions.can_write_folder)) {
		throw Error('can_write_folder not defined');
	}
	return destinationNode.permissions.can_write_folder;
}

export function canUploadFile(
	destinationNode: Pick<ActionsFactoryNodeType, '__typename' | 'permissions'>
): boolean {
	if (isFile(destinationNode)) {
		throw Error('destinationNode must be a Folder');
	}
	if (!isBoolean(destinationNode.permissions.can_write_file)) {
		throw Error('can_write_file not defined');
	}
	return destinationNode.permissions.can_write_file;
}

export function canCreateFile(
	destinationNode: Pick<ActionsFactoryNodeType, '__typename' | 'permissions'>
): boolean {
	if (isFile(destinationNode)) {
		throw Error('destinationNode must be a Folder');
	}
	if (!isBoolean(destinationNode.permissions.can_write_file)) {
		throw Error('can_write_file not defined');
	}
	return destinationNode.permissions.can_write_file;
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

export function canBeMoveDestination(
	destinationNode: Pick<ActionsFactoryNodeType, '__typename' | 'permissions' | 'id' | 'owner'>,
	nodesToMove: Array<Pick<ActionsFactoryNodeType, '__typename' | 'id' | 'owner'>>,
	loggedUserId: string
): boolean {
	const movingFile = find(nodesToMove, (node) => isFile(node)) !== undefined;
	const movingFolder = find(nodesToMove, (node) => isFolder(node)) !== undefined;
	// a node can be de destination of a move action if and only if
	// - has permission to write nodes in it
	// - is not one of the moving nodes (cannot move a folder inside itself)
	// - has the same owner of the files that are written (workspace concept)
	const destinationOwnerId = destinationNode.owner?.id || loggedUserId;
	const isSameOwner = !some(nodesToMove, (node) => node.owner.id !== destinationOwnerId);
	return (
		canBeWriteNodeDestination(destinationNode, movingFile, movingFolder) &&
		find(nodesToMove, ['id', destinationNode.id]) === undefined &&
		isSameOwner
	);
}

export function canBeCopyDestination(
	destinationNode: Pick<ActionsFactoryNodeType, '__typename' | 'permissions' | 'id'>,
	nodesToCopy: Array<Pick<ActionsFactoryNodeType, '__typename'>>
): boolean {
	const copyingFile = find(nodesToCopy, (node) => isFile(node)) !== undefined;
	const copyingFolder = find(nodesToCopy, (node) => isFolder(node)) !== undefined;
	// a node can be de destination of a copy action if and only if
	// - has permission to write nodes in it
	// - is not one of the copying nodes (cannot copy a folder inside itself)
	return (
		canBeWriteNodeDestination(destinationNode, copyingFile, copyingFolder) &&
		find(nodesToCopy, ['id', destinationNode.id]) === undefined
	);
}

export function canRestore(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	let someNotTrashed: boolean;
	const $nodes = nodes as OneOrMany<ActionsFactoryNodeType>;
	if ($nodes instanceof Array) {
		someNotTrashed = some($nodes, (node) => node.rootId !== ROOTS.TRASH);
	} else {
		someNotTrashed = $nodes.rootId === ROOTS.TRASH;
	}
	return hasWritePermission($nodes, 'canRestore') && !someNotTrashed;
}

export function canMarkForDeletion(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	let someTrashed: boolean;
	const $nodes = nodes as OneOrMany<ActionsFactoryNodeType>;
	if ($nodes instanceof Array) {
		someTrashed = some($nodes, (node) => node.rootId === ROOTS.TRASH);
	} else {
		someTrashed = $nodes.rootId === ROOTS.TRASH;
	}
	return hasWritePermission($nodes, 'canMarkForDeletion') && !someTrashed;
}

export function canUpsertDescription(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	const $nodes = nodes as ActionsFactoryNodeType[];
	return hasWritePermission($nodes, 'canUpsertDescription');
}

export function canDeletePermanently(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	const $nodes = nodes as OneOrMany<ActionsFactoryNodeType>;
	if (!($nodes instanceof Array)) {
		if (isFile($nodes) || isFolder($nodes)) {
			if (!isBoolean($nodes.permissions.can_delete)) {
				throw Error('can_delete not defined');
			}
			return $nodes.permissions.can_delete && $nodes.rootId === ROOTS.TRASH;
		}
		throw Error(`cannot evaluate DeletePermanently on UnknownType`);
	} else {
		return every($nodes, (node) => canDeletePermanently(node));
	}
}

export function canMove(
	nodes: OneOrMany<ActionsFactoryGlobalType>,
	loggedUserId?: string
): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canMove on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canMove on empty nodes array');
	}
	const $nodes = nodes as ActionsFactoryNodeType[];
	return every($nodes, (node) => {
		let canMoveResult = false;
		if (isFile(node)) {
			if (!isBoolean(node.permissions.can_write_file)) {
				throw Error('can_write_file not defined');
			}
			// a file can be moved if it has can_write_file permission, and it has a parent which has can_write_file permission.
			// If a node is shared with me and its parent is the LOCAL_ROOT, then the node cannot be moved (it's a direct share)
			canMoveResult =
				node.permissions.can_write_file &&
				!!node.parent &&
				// TODO: REMOVE CHECK ON ROOT WHEN BE WILL NOT RETURN LOCAL_ROOT AS PARENT FOR SHARED NODES
				(node.parent.id !== ROOTS.LOCAL_ROOT || node.owner.id === loggedUserId) &&
				!!node.parent.permissions.can_write_file &&
				node.rootId !== ROOTS.TRASH;
		} else if (isFolder(node)) {
			if (!isBoolean(node.permissions.can_write_folder)) {
				throw Error('can_write_folder not defined');
			}
			// a folder can be moved if it has can_write_folder permission and it has a parent which has can_write_folder permission
			canMoveResult =
				node.permissions.can_write_folder &&
				!!node.parent &&
				// TODO: REMOVE CHECK ON ROOT WHEN BE WILL NOT RETURN LOCAL_ROOT AS PARENT FOR SHARED NODES
				(node.parent.id !== ROOTS.LOCAL_ROOT || node.owner.id === loggedUserId) &&
				!!node.parent?.permissions.can_write_folder &&
				node.rootId !== ROOTS.TRASH;
		} else {
			throw Error('cannot evaluate canMove on UnknownType');
		}
		return canMoveResult;
	});
}

export function canCopy(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canCopy on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canCopy on empty nodes array');
	}
	const $nodes = nodes as ActionsFactoryNodeType[];
	return every($nodes, (node) => node.rootId !== ROOTS.TRASH);
}

export function canDownload(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canDownload on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canDownload on empty nodes array');
	}
	const $nodes = nodes as ActionsFactoryNodeType[];
	// TODO: evaluate when batch will be enabled
	// TODO: remove file check when download will be implemented also for folders
	return size($nodes) === 1 && isFile($nodes[0]) && $nodes[0].rootId !== ROOTS.TRASH;
}

export function canOpenWithDocs(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canOpenWithDocs on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canOpenWithDocs on empty nodes array');
	}
	const $nodes = nodes as ActionsFactoryNodeType[];
	return (
		size($nodes) === 1 &&
		isFile($nodes[0]) &&
		includes(docsHandledMimeTypes, $nodes[0].mime_type) &&
		$nodes[0].rootId !== ROOTS.TRASH &&
		!$nodes[0].permissions.can_write_file &&
		$nodes[0].permissions.can_read
	);
}

export function canOpenVersionWithDocs(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canOpenWithDocs on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canOpenWithDocs on empty nodes array');
	}
	const $nodes = nodes as ActionsFactoryNodeType[];
	return (
		size($nodes) === 1 &&
		isFile($nodes[0]) &&
		includes(docsHandledMimeTypes, $nodes[0].mime_type) &&
		$nodes[0].rootId !== ROOTS.TRASH
	);
}

export function canEdit(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canEdit on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canEdit on empty nodes array');
	}
	const $nodes = nodes as ActionsFactoryNodeType[];
	return (
		size($nodes) === 1 &&
		isFile($nodes[0]) &&
		includes(docsHandledMimeTypes, $nodes[0].mime_type) &&
		$nodes[0].rootId !== ROOTS.TRASH &&
		$nodes[0].permissions.can_write_file
	);
}

export function canPreview(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canPreview on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canPreview on empty nodes array');
	}
	const $nodes = nodes as ActionsFactoryNodeType[];
	return (
		size($nodes) === 1 &&
		isFile($nodes[0]) &&
		$nodes[0].rootId !== ROOTS.TRASH &&
		!(
			$nodes[0].permissions.can_write_file && includes(docsHandledMimeTypes, $nodes[0].mime_type)
		) &&
		(isSupportedByPreview($nodes[0].mime_type)[0] ||
			includes(docsHandledMimeTypes, $nodes[0].mime_type))
	);
}

export function canRemoveUpload(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canRemoveUpload on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canRemoveUpload on empty nodes array');
	}
	return true;
}

export function canRetryUpload(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canRetryUpload on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canRetryUpload on empty nodes array');
	}
	const $nodes = nodes as ActionsFactoryUploadItem[];
	// can retry only if all selected nodes are failed
	return (
		find(
			$nodes,
			(node) =>
				node.status !== UploadStatus.FAILED ||
				node.parentNodeId === undefined ||
				node.parentNodeId === null
		) === undefined
	);
}

export function canGoToFolder(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canGoToFolder on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canGoToFolder on empty nodes array');
	}
	const $nodes = nodes as ActionsFactoryUploadItem[];
	// can go to folder only if all selected nodes have the same parent
	return every(
		$nodes,
		(node, index, array) =>
			node.parentNodeId && array[0].parentNodeId && node.parentNodeId === array[0].parentNodeId
	);
}

export function canSendViaMail(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (includes(ACTIONS_TO_REMOVE_DUE_TO_PRODUCT_CONTEXT, Action.SendViaMail)) {
		return false;
	}
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canSendViaMail on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canSendViaMail on empty nodes array');
	}
	const $nodes = nodes as ActionsFactoryNodeType[];
	// TODO: evaluate when batch will be enabled
	// TODO: remove file check when canSendViaMail will be implemented also for folders
	return size($nodes) === 1 && isFile($nodes[0]) && $nodes[0].rootId !== ROOTS.TRASH;
}

export function canManageShares(nodes: OneOrMany<ActionsFactoryGlobalType>): boolean {
	if (!(nodes instanceof Array)) {
		throw Error('cannot evaluate canManageShares on Node type');
	}
	if (size(nodes) === 0) {
		throw Error('cannot evaluate canManageShares on empty nodes array');
	}
	const $nodes = nodes as ActionsFactoryNodeType[];
	return size(nodes) === 1 && $nodes[0].rootId !== ROOTS.TRASH;
}

const actionsCheckMap: {
	[key in Action]: (nodes: OneOrMany<ActionsFactoryGlobalType>, loggedUserId?: string) => boolean;
} = {
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
	// [Actions.CreateFolder]: canCreateFolder,
};

export function getPermittedActions(
	nodes: ActionsFactoryGlobalType[],
	actions: Action[],
	// TODO: REMOVE CHECK ON ROOT WHEN BE WILL NOT RETURN LOCAL_ROOT AS PARENT FOR SHARED NODES
	loggedUserId?: string,
	customCheckers?: ActionsFactoryCheckerMap
): Action[] {
	return reduce(
		actions,
		(accumulator: Action[], action: Action) => {
			if (size(nodes) > 0) {
				let externalCheckerResult = true;
				const externalChecker = customCheckers && customCheckers[action];
				if (externalChecker) {
					externalCheckerResult = externalChecker(nodes);
				}
				if (actionsCheckMap[action](nodes, loggedUserId) && externalCheckerResult) {
					accumulator.push(action);
				}
			}
			return accumulator;
		},
		[]
	);
}

export function getAllPermittedActions(
	nodes: ActionsFactoryNodeType[],
	// TODO: REMOVE CHECK ON ROOT WHEN BE WILL NOT RETURN LOCAL_ROOT AS PARENT FOR SHARED NODES
	loggedUserId?: string,
	customCheckers?: ActionsFactoryCheckerMap
): Action[] {
	return getPermittedActions(
		nodes as ActionsFactoryGlobalType[],
		completeListActions,
		loggedUserId,
		customCheckers
	);
}

export function getPermittedHoverBarActions(node: ActionsFactoryNodeType): Action[] {
	return getPermittedActions([node as ActionsFactoryGlobalType], hoverBarActions);
}

export function getPermittedUploadActions(
	nodes: ActionsFactoryUploadItem[],
	customCheckers?: ActionsFactoryCheckerMap
): Action[] {
	return getPermittedActions(
		nodes as ActionsFactoryGlobalType[],
		uploadActions,
		undefined,
		customCheckers
	);
}

export function buildActionItems(
	itemsMap: Partial<Record<Action, DSAction>>,
	actions: Action[] = []
): DSAction[] {
	return reduce<Action, DSAction[]>(
		actions,
		(accumulator, action) => {
			const actionItem = itemsMap[action];
			if (actionItem) {
				accumulator.push(actionItem);
			}
			return accumulator;
		},
		[]
	);
}
