/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export const ACTION_REGEXP = {
	rename: /^rename$/i,
	copy: /^copy$/i,
	flag: /^flag$/i,
	unflag: /^unflag$/i,
	move: /^move$/i,
	moveToTrash: /^move to trash$/i,
	download: /^download$/i,
	openDocument: /^open document$/i,
	deletePermanently: /^delete permanently$/i,
	restore: /^restore$/i,
	manageShares: /^manage shares$/i,
	preview: /^preview$/i,
	retryUpload: /^retry upload$/i,
	removeUpload: /^remove upload$/i,
	goToFolder: /^go to destination folder$/i
} as const;

export const ICON_REGEXP = {
	moreVertical: /^icon: MoreVertical$/i,
	moveToTrash: /^icon: Trash2Outline$/i,
	restore: /^icon: RestoreOutline$/i,
	deletePermanently: /^icon: DeletePermanentlyOutline$/i,
	rename: /^icon: Edit2Outline$/i,
	copy: /^icon: Copy$/i,
	move: /^icon: MoveOutline$/i,
	flag: /^icon: FlagOutline$/i,
	unflag: /^icon: UnflagOutline$/i,
	download: /^icon: Download$/i,
	openDocument: /^icon: BookOpenOutline$/i,
	close: /^icon: Close$/i,
	trash: /^icon: Trash2Outline$/i,
	retryUpload: /^icon: PlayCircleOutline$/i,
	removeUpload: /^icon: CloseCircleOutline$/i,
	goToFolder: /^icon: FolderOutline$/i,
	uploadFailed: /^icon: AlertCircle$/i,
	uploadCompleted: /^icon: CheckmarkCircle2$/i,
	uploadLoading: /^icon: AnimatedLoader$/i
} as const;

export const SELECTORS = {
	dropdownList: 'dropdown-popper-list',
	checkedAvatar: 'checkedAvatar',
	uncheckedAvatar: 'unCheckedAvatar'
};

export const EMITTER_CODES = {
	success: 'done-success',
	fail: 'done-fail',
	never: 'never'
};
