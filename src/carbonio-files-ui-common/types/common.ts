/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { DragEventHandler } from 'react';

import { BreadcrumbsProps, ChipItem } from '@zextras/carbonio-design-system';

import { UploadItem } from './graphql/client-types';
import {
	BaseNodeFragment,
	ChildFragment,
	File as FilesFile,
	FindNodesQueryVariables,
	Folder,
	GetNodeQuery,
	Maybe,
	Permissions,
	Share,
	User
} from './graphql/types';
import { MakeOptional, SnakeToCamelCase } from './utils';

export type Node = FilesFile | Folder;

export type PickIdNodeType = Pick<Node, 'id'>;

export type PickIdTypenameNodeType = Pick<Node, 'id' | '__typename'>;

export type GetNodeParentType = {
	parent?: Maybe<
		| ({ __typename?: 'File' } & Pick<FilesFile, 'id' | 'name'> & {
					permissions: { __typename?: 'Permissions' } & Pick<
						Permissions,
						| 'can_read'
						| 'can_write_file'
						| 'can_write_folder'
						| 'can_delete'
						| 'can_add_version'
						| 'can_read_link'
						| 'can_change_link'
						| 'can_share'
						| 'can_read_share'
						| 'can_change_share'
					>;
				})
		| ({ __typename?: 'Folder' } & Pick<Folder, 'id' | 'name'> & {
					permissions: { __typename?: 'Permissions' } & Pick<
						Permissions,
						| 'can_read'
						| 'can_write_file'
						| 'can_write_folder'
						| 'can_delete'
						| 'can_add_version'
						| 'can_read_link'
						| 'can_change_link'
						| 'can_share'
						| 'can_read_share'
						| 'can_change_share'
					>;
				})
	>;
};

export type Crumb = BreadcrumbsProps['crumbs'][number];

export type CrumbNode = Pick<Node, 'id' | 'name' | 'type'> & {
	parent?: Maybe<
		Pick<Node, 'id' | 'name' | 'type'> & { parent?: Maybe<Pick<Node, 'id' | 'name' | 'type'>> }
	>;
};

export type DroppableCrumb = Crumb & {
	onDragEnter?: DragEventHandler;
	onDragLeave?: DragEventHandler;
	onDragOver?: DragEventHandler;
	onDrop?: DragEventHandler;
};

export enum Role {
	Viewer = 'Viewer',
	Editor = 'Editor'
}

export type NodeListItemType = ChildFragment & {
	disabled?: boolean;
	selectable?: boolean;
	shares?: Array<Pick<Share, '__typename' | 'created_at'> | null | undefined>;
};

export type RootListItemType = Pick<
	NodeListItemType,
	'__typename' | 'id' | 'name' | 'type' | 'disabled' | 'selectable'
>;

export type SortableNode = Pick<Node, 'id' | 'name' | 'updated_at' | 'type'> &
	MakeOptional<Pick<File, 'size'>, 'size'>;

export interface UploadFolderItem extends UploadItem {
	children: Array<UploadItem['id']>;
	contentCount: number;
	failedCount: number;
}

export enum DocsType {
	LIBRE_DOCUMENT = 'LIBRE_DOCUMENT',
	LIBRE_SPREADSHEET = 'LIBRE_SPREADSHEET',
	LIBRE_PRESENTATION = 'LIBRE_PRESENTATION',
	MS_DOCUMENT = 'MS_DOCUMENT',
	MS_SPREADSHEET = 'MS_SPREADSHEET',
	MS_PRESENTATION = 'MS_PRESENTATION'
}

export type CreateDocsFile = GetNodeQuery;

export type SearchChip = ChipItem;

export enum OrderTrend {
	Ascending = 'Ascending',
	Descending = 'Descending'
}

export enum OrderType {
	Name = 'Name',
	UpdatedAt = 'UpdatedAt',
	Size = 'Size'
}

export type SearchParams = {
	[K in keyof Pick<
		FindNodesQueryVariables,
		| 'flagged'
		| 'shared_by_me'
		| 'shared_with_me'
		| 'folder_id'
		| 'cascade'
		| 'keywords'
		| 'direct_share'
		| 'owner_id'
		| 'type'
	> as SnakeToCamelCase<K & string>]: FindNodesQueryVariables[K];
};

export type AdvancedFilters = {
	[P in keyof Omit<
		SearchParams,
		'keywords' | 'cascade' | 'sharedWithMe' | 'directShare'
	>]: SearchChip & {
		value: SearchParams[P];
	};
} & {
	[P in keyof Pick<SearchParams, 'keywords'>]: Array<
		SearchChip & {
			value: NonNullable<SearchParams[P]> extends Array<infer U> ? U : unknown;
		}
	>;
} & {
	[P in keyof Pick<SearchParams, 'sharedWithMe' | 'cascade'>]: { value: SearchParams[P] };
};

export enum ErrorCode {
	/** Used By:
	 * updateLink
	 * deleteLinks
	 */
	LINK_NOT_FOUND = 'LINK_NOT_FOUND',
	/** Used By:
	 * getNode
	 * updateNode
	 * deleteNodes
	 * createFolder (destination does not exists)
	 * getPath
	 */
	NODE_NOT_FOUND = 'NODE_NOT_FOUND',
	/** Used By:
	 * getUser
	 * getAccountByEmail
	 */
	ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
	/**
	 * The client requests file version attributes in one of these APIs:
	 * getNode
	 * updateNode
	 * deleteNodes
	 * createFolder (destination does not exist)
	 * getPath
	 * and a specific version is not present in the db
	 */
	FILE_VERSION_NOT_FOUND = 'FILE_VERSION_NOT_FOUND',
	/** Used By:
	 * getShare
	 * updateShare
	 * deleteShare
	 */
	SHARE_NOT_FOUND = 'SHARE_NOT_FOUND',
	/** Used By:
	 * createShare
	 */
	SHARE_CREATION_ERROR = 'SHARE_CREATION_ERROR',
	/**
	 * The client requests distribution list attributes in getAccountByEmail and the system does not find the related
	 * distribution list
	 */
	MISSING_FIELD = 'MISSING_FIELD',
	/** Used By:
	 * trashNode
	 * restoreNodes
	 * moveNodes (no permission to move a node)
	 * copyNodes (no permission to copy a node)
	 */
	NODE_WRITE_ERROR = 'NODE_WRITE_ERROR'
}

export enum PublicLinkRowStatus {
	OPEN,
	CLOSED,
	DISABLED
}

export interface Contact {
	id?: string;
	firstName?: string;
	middleName?: string;
	lastName?: string;
	fullName?: string;
	// eslint-disable-next-line camelcase
	full_name?: string;
	email?: string;
	name?: string;
	company?: string;
}

export type RootsType = {
	ENTRY_POINT: 'ROOTS_ENTRY_POINT';
	LOCAL_ROOT: 'LOCAL_ROOT';
	TRASH: 'TRASH_ROOT';
	TRASH_MY_ELEMENTS: 'TRASH_ROOT_MY_ELEMENTS';
	TRASH_SHARED_ELEMENTS: 'TRASH_ROOT_SHARED_ELEMENTS';
	SHARED_WITH_ME: 'SHARED_WITH_ME_ROOT';
};

export type URLParams = {
	view?: 'root' | 'uploads' | 'search' | 'filter';
	filter: 'flagged' | 'myTrash' | 'sharedTrash' | 'sharedByMe' | 'sharedWithMe' | 'recents';
	rootId: RootsType[keyof RootsType];
};

export type TargetModule = 'MAILS' | 'CONTACTS' | 'CALENDARS' | 'CHATS';

export type NodeWithMetadata = BaseNodeFragment;

export enum Action {
	Edit = 'EDIT',
	Preview = 'PREVIEW',
	SendViaMail = 'SEND_VIA_MAIL',
	Download = 'DOWNLOAD',
	ManageShares = 'MANAGE_SHARES',
	Flag = 'FLAG',
	UnFlag = 'UNFLAG',
	OpenWithDocs = 'OPEN_WITH_DOCS',
	Copy = 'COPY',
	Move = 'MOVE',
	Rename = 'RENAME',
	MoveToTrash = 'MOVE_TO_TRASH',
	Restore = 'RESTORE',
	DeletePermanently = 'DELETE_PERMANENTLY',
	UpsertDescription = 'UPSERT_DESCRIPTION',
	RemoveUpload = 'REMOVE_UPLOAD',
	RetryUpload = 'RETRY_UPLOAD',
	GoToFolder = 'GO_TO_FOLDER'
	// CreateFolder = 'CREATE_FOLDER',
}

export interface ShareChip extends ChipItem {
	value: {
		id: string | undefined;
		sharingAllowed: boolean;
		role: Role;
		onUpdate: (
			id: string | undefined,
			updatedPartialObject: Partial<Omit<ShareChip['value'], 'onUpdate'>>
		) => void;
	} & (Contact | User);
}
