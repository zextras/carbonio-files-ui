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
	breadcrumbCtaExpand: 'icon: ChevronRight',
	breadcrumbCtaReduce: 'icon: ChevronLeft',
	breadcrumbCta: 'icon: FolderOutline',
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
	share: 'icon: ShareOutline',
	retryUpload: /^icon: PlayCircleOutline$/i,
	removeUpload: /^icon: CloseCircleOutline$/i,
	goToFolder: /^icon: FolderOutline$/i,
	uploadFailed: /^icon: AlertCircle$/i,
	uploadCompleted: /^icon: CheckmarkCircle2$/i,
	uploadLoading: /^icon: AnimatedLoader$/i,
	previewClose: 'icon: ArrowBackOutline',
	previewDownload: 'icon: DownloadOutline',
	queryLoading: /^icon: Refresh$/i
} as const;

export const SELECTORS = {
	dropdownList: 'dropdown-popper-list',
	checkedAvatar: 'icon: Checkmark',
	pdfPreview: 'pdf-preview-container',
	uncheckedAvatar: 'file-icon-selecting',
	nodeAvatar: 'file-icon-preview',
	nodeDetails: 'node-details',
	nodeSharing: 'node-sharing',
	collaborationLinkContainer: 'collaboration-link-container',
	collaborationLinkReadShare: 'read-share-collaboration-link-container',
	collaborationLinkWriteShare: 'read-write-share-collaboration-link-container',
	sharingTabCollaborators: 'node-sharing-collaborators',
	exclusiveSelectionEditor: 'exclusive-selection-editor',
	exclusiveSelectionViewer: 'exclusive-selection-viewer',
	chipWithPopover: 'chip-with-popover',
	listHeader: 'list-header',
	listHeaderSelectionMode: 'list-header-selectionModeActive',
	list(id = ''): string {
		return `list-${id}`;
	},
	modal: 'modal',
	modalList: 'modal-list',
	modalListHeader: 'modal-list-header',
	nodeItem(id = ''): string {
		return `node-item-${id}`;
	},
	dropzone: 'dropzone-overlay',
	dropCrumb: 'drop-crumb',
	versionIcons(version: number): string {
		return `version${version}-icons`;
	},
	addShareInputContainer: 'add-shares-input-container',
	addShareChipInput: 'add-sharing-chip-input',
	displayer: 'displayer',
	displayerHeader: 'DisplayerHeader',
	displayerActionsHeader: 'displayer-actions-header',
	detailsNodeItem(id = ''): string {
		return `details-node-item-${id}`;
	},
	avatar: 'avatar',
	customBreadcrumbs: 'customBreadcrumbs',
	missingFilter: 'missing-filter'
};

export const EMITTER_CODES = {
	success: 'done-success',
	fail: 'done-fail',
	never: 'never'
};

export const COLORS = {
	primary: {
		regular: '#2b73d2'
	},
	highlight: {
		regular: '#d5e3f6'
	},
	dropzone: {
		enabled: 'rgba(43, 115, 210, 0.4)',
		disabled: 'rgba(130, 130, 130, 0.4)'
	}
};
