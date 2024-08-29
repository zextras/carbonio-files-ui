/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { DocsType, RootsType, SearchParams, URLParams } from '../types/common';
import { NodeSort } from '../types/graphql/types';

export const NODES_LOAD_LIMIT = 25;
export const NODES_SORT_DEFAULT = NodeSort.NameAsc;
export const VIEW_MODE = { grid: 'grid', list: 'list' } as const;
export const VIEW_MODE_DEFAULT = VIEW_MODE.list;
export const GRID_ITEM_MIN_WIDTH = '13.4375rem';
export const LIST_ITEM_HEIGHT = '4rem';
export const LIST_ITEM_HEIGHT_COMPACT = '3.25rem';
export const LIST_ITEM_HEIGHT_DETAILS = '3.25rem';
export const LIST_ITEM_AVATAR_HEIGHT = '2.625rem';
export const LIST_ITEM_AVATAR_HEIGHT_COMPACT = '2rem';
export const LIST_ITEM_AVATAR_ICON_HEIGHT = '1.5rem';
export const LIST_ITEM_AVATAR_ICON_HEIGHT_COMPACT = '1rem';
export const BREADCRUMB_ROW_HEIGHT = '3rem';
export const LIST_WIDTH = '40%';
export const DISPLAYER_WIDTH = '60%';
export const FULL_SHARES_LOAD_LIMIT = 100;
export const SHARES_LOAD_LIMIT = 6;
export const DOUBLE_CLICK_DELAY = 200;
export const DISPLAYER_TABS = {
	details: 'details',
	sharing: 'sharing',
	versioning: 'versioning'
} as const;
export const ROOTS = {
	ENTRY_POINT: 'ROOTS_ENTRY_POINT',
	LOCAL_ROOT: 'LOCAL_ROOT',
	TRASH: 'TRASH_ROOT',
	TRASH_MY_ELEMENTS: 'TRASH_ROOT_MY_ELEMENTS',
	TRASH_SHARED_ELEMENTS: 'TRASH_ROOT_SHARED_ELEMENTS',
	SHARED_WITH_ME: 'SHARED_WITH_ME_ROOT'
} as const satisfies RootsType;
export const DRAG_TYPES = {
	upload: 'Files',
	move: 'files-drag-move',
	markForDeletion: 'files-drag-markfordeletion'
};
export const SHARE_CHIP_SIZE = 'small';
export const SHARE_CHIP_MAX_WIDTH = '18.75rem';
export const CONFIGS = {
	MAX_VERSIONS: 'max-number-of-versions',
	MAX_KEEP_VERSIONS: 'max-number-of-keep-versions'
} as const;
export const PREVIEW_MAX_SIZE = 20971520;
export const FILTER_PARAMS: Record<URLParams['filter'], SearchParams> = {
	flagged: {
		flagged: true,
		folderId: ROOTS.LOCAL_ROOT,
		cascade: true
	},
	sharedByMe: {
		sharedByMe: true,
		folderId: ROOTS.LOCAL_ROOT,
		cascade: true,
		directShare: true
	},
	sharedWithMe: {
		sharedWithMe: true,
		folderId: ROOTS.LOCAL_ROOT,
		cascade: true,
		directShare: true
	},
	myTrash: {
		folderId: ROOTS.TRASH,
		sharedWithMe: false,
		cascade: false
	},
	sharedTrash: {
		folderId: ROOTS.TRASH,
		sharedWithMe: true,
		cascade: false
	},
	recents: {
		folderId: ROOTS.LOCAL_ROOT,
		cascade: true
	}
} as const;
export const TIMERS = {
	DRAG_NAVIGATION_TRIGGER: 1500,
	MOUSE_MOVE_TIMEOUT: 1000,
	SHOW_DROPZONE: 25,
	HIDE_DROPZONE: 50,
	DRAG_THROTTLE: 100,
	DRAG_PREVENT_HOVER_DROPDOWN: 10,
	DRAG_DELAY_CLOSE_DROPDOWN: 150,
	DISPLAYER_SHOW_MESSAGE: 250,
	DELAY_WAIT_RENDER_AND_PRAY: 500
} as const;
export const DOCS_EXTENSIONS: Record<DocsType, string> = {
	[DocsType.LIBRE_DOCUMENT]: 'odt',
	[DocsType.LIBRE_SPREADSHEET]: 'ods',
	[DocsType.LIBRE_PRESENTATION]: 'odp',
	[DocsType.MS_DOCUMENT]: 'docx',
	[DocsType.MS_SPREADSHEET]: 'xlsx',
	[DocsType.MS_PRESENTATION]: 'pptx'
} as const;
export const DOCS_SERVICE_NAME = 'carbonio-docs-connector';
export const PREVIEW_SERVICE_NAME = 'carbonio-preview';
export const DATE_FORMAT = {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
} satisfies Intl.DateTimeFormatOptions;
export const DATE_FORMAT_SHORT = {
	year: '2-digit',
	month: '2-digit',
	day: '2-digit'
} satisfies Intl.DateTimeFormatOptions;
export const TIME_FORMAT = {
	hour: '2-digit',
	minute: '2-digit'
} satisfies Intl.DateTimeFormatOptions;
export const DATE_TIME_FORMAT = {
	...DATE_FORMAT_SHORT,
	...TIME_FORMAT
} satisfies Intl.DateTimeFormatOptions;
export const HTTP_STATUS_CODE = {
	success: 200,
	internalServerError: 500,
	/**
	 * upload-version error should happen only when number of versions is
	 * strictly greater than max number of version allowed by config value
	 * (caused by a change of the config)
	 */
	maxVersionReached: 405,
	/** aborted or blocked request */
	aborted: 0,
	overQuota: 422
} as const;

export const ERROR_CODE = {
	overQuotaReached: 'OVER_QUOTA_REACHED',
	nodeWriteError: 'NODE_WRITE_ERROR'
} as const;

// endpoint
// keep endpoint without trailing slash
export const GRAPHQL_ENDPOINT = '/services/files/graphql';
export const REST_ENDPOINT = '/services/files';
export const DOCS_ENDPOINT = '/services/docs';
export const STORAGES_ENDPOINT = '/services/storages';
// add leading slash in path
export const OPEN_FILE_PATH = '/files/open';
export const DOWNLOAD_PATH = '/download';
export const UPLOAD_PATH = '/upload';
export const UPLOAD_TO_PATH = '/upload-to';
export const UPLOAD_VERSION_PATH = '/upload-version';
export const CREATE_FILE_PATH = '/files/create';
export const MYSELF_QUOTA_PATH = '/quota/myself';
export const HEALTH_PATH = '/health';
export const PREVIEW_PATH = '/preview';
export const PREVIEW_TYPE = {
	IMAGE: 'image',
	PDF: 'pdf',
	DOCUMENT: 'document'
} as const;
// internal paths
export const INTERNAL_PATH: {
	[K in Uppercase<NonNullable<URLParams['view']>>]: `/${Lowercase<K>}`;
} = {
	ROOT: '/root',
	UPLOADS: '/uploads',
	SEARCH: '/search',
	FILTER: '/filter'
} as const;
export const FILTER_TYPE = {
	flagged: '/flagged',
	sharedByMe: '/sharedByMe',
	sharedWithMe: '/sharedWithMe',
	myTrash: '/myTrash',
	sharedTrash: '/sharedTrash',
	recents: '/recents'
} as const satisfies { [K in URLParams['filter']]: `/${K}` };

export const FILES_ROUTE = 'files';
export const FILES_APP_ID = 'carbonio-files-ui';
