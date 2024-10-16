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
	editDocument: /^edit$/i,
	deletePermanently: /^delete permanently$/i,
	restore: /^restore$/i,
	manageShares: /^manage shares$/i,
	preview: /^preview$/i,
	retryUpload: /^retry upload$/i,
	removeUpload: /^remove upload$/i,
	goToFolder: /^go to destination folder$/i,
	newDocument: /^new document$/i,
	newPresentation: /^new presentation$/i,
	newSpreadsheet: /^new spreadsheet$/i,
	cloneVersion: /^clone as current$/i
} as const;

export const ICON_REGEXP = {
	breadcrumbCtaExpand: 'icon: ChevronRight',
	breadcrumbCtaReduce: 'icon: ChevronLeft',
	breadcrumbCta: 'icon: FolderOutline',
	checkboxChecked: 'icon: CheckmarkSquare',
	checkboxUnchecked: 'icon: Square',
	versionKeepForever: 'icon: InfinityOutline',
	shareCanRead: 'icon: EyeOutline',
	shareCanWrite: 'icon: Edit2Outline',
	shareCanShare: 'icon: Share',
	edit: 'icon: Edit2Outline',
	save: 'icon: SaveOutline',
	searchInFolder: 'icon: FolderOutline',
	searchFolderChip: 'icon: Folder',
	switchOn: 'icon: ToggleRight',
	switchOff: 'icon: ToggleLeftOutline',
	openCalendarPicker: 'icon: CalendarOutline',
	link: 'icon: Link2',
	moreVertical: 'icon: MoreVertical',
	moreHorizontal: 'icon: MoreHorizontalOutline',
	sharedByMe: 'icon: ArrowCircleRight',
	sharedWithMe: 'icon: ArrowCircleLeft',
	sortAsc: 'icon: AzListOutline',
	sortDesc: 'icon: ZaListOutline',
	exitSelectionMode: 'icon: ArrowBackOutline',
	moveToTrash: 'icon: Trash2Outline',
	restore: 'icon: RestoreOutline',
	deletePermanently: 'icon: DeletePermanentlyOutline',
	rename: 'icon: Edit2Outline',
	copy: 'icon: Copy',
	move: 'icon: MoveOutline',
	flag: 'icon: FlagOutline',
	flagged: 'icon: Flag',
	unflag: 'icon: UnflagOutline',
	download: 'icon: Download',
	openDocument: 'icon: BookOpenOutline',
	close: 'icon: Close',
	trash: 'icon: Trash2Outline',
	share: 'icon: ShareOutline',
	retryUpload: 'icon: PlayCircleOutline',
	removeUpload: 'icon: CloseCircleOutline',
	goToFolder: 'icon: FolderOutline',
	uploadFailed: 'icon: AlertCircle',
	overQuota: 'icon: AlertCircle',
	uploadCompleted: 'icon: CheckmarkCircle2',
	uploadLoading: 'icon: AnimatedLoader',
	previewClose: 'icon: ArrowBackOutline',
	previewDownload: 'icon: DownloadOutline',
	preview: 'icon: MaximizeOutline',
	queryLoading: 'icon: Refresh',
	revoke: 'icon: SlashOutline',
	refreshQuota: 'icon: Refresh',
	alertQuota: 'icon: CloseCircleOutline',
	errorSnackbar: 'icon: CloseCircleOutline',
	openedAdvancedFilters: 'icon: ChevronUp',
	closedAdvancedFilters: 'icon: ChevronDown',
	listViewMode: 'icon: ListOutline',
	gridViewMode: 'icon: GridOutline'
} as const;

export const SELECTORS = {
	filesQuota: 'files-quota',
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
	chip: 'chip',
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
	missingFilter: 'missing-filter',
	popper: 'popper',
	mainList: 'main-list',
	mainGrid: 'main-grid',
	gridCellThumbnail: 'grid-cell-thumbnail',
	virtualizedNodeListItem: 'virtualized-node-list-item',
	snackbar: 'snackbar'
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
	},
	text: {
		regular: '#333333',
		disabled: '#cccccc'
	},
	dropdownItem: {
		disabled: '#828282' // secondary.regular
	},
	shareChipPopover: {
		disabled: '#828282', // secondary.regular
		enabled: '#333333', // text.regular
		active: '#2b73d2' // primary.regular
	}
};

export const TIMERS = {
	modalDelayOpen: 1,
	snackbarHide: 4000,
	dropdownListeners: 1
};
export const DISPLAYER_EMPTY_MESSAGE = 'View files and folders, share them with your contacts.';
export const LIST_EMPTY_MESSAGE = "It looks like there's nothing here.";
