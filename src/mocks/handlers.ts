/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { graphql, http, RequestHandler } from 'msw';

import {
	DOCS_ENDPOINT,
	CREATE_FILE_PATH,
	REST_ENDPOINT,
	UPLOAD_PATH,
	UPLOAD_VERSION_PATH,
	PREVIEW_PATH,
	STORAGES_ENDPOINT,
	MYSELF_QUOTA_PATH
} from '../carbonio-files-ui-common/constants';
import handleCopyNodesRequest from '../carbonio-files-ui-common/mocks/handleCopyNodesRequest';
import handleCreateDocsFileRequest from '../carbonio-files-ui-common/mocks/handleCreateDocsFileRequest';
import handleCreateFolderRequest from '../carbonio-files-ui-common/mocks/handleCreateFolderRequest';
import handleCreateLinkRequest from '../carbonio-files-ui-common/mocks/handleCreateLinkRequest';
import handleCreateShareRequest from '../carbonio-files-ui-common/mocks/handleCreateShareRequest';
import handleDeleteLinksRequest from '../carbonio-files-ui-common/mocks/handleDeleteLinkRequest';
import handleDeleteNodesRequest from '../carbonio-files-ui-common/mocks/handleDeleteNodesRequest';
import handleDeleteShareRequest from '../carbonio-files-ui-common/mocks/handleDeleteShareRequest';
import handleFindNodesRequest from '../carbonio-files-ui-common/mocks/handleFindNodesRequest';
import handleFlagNodesRequest from '../carbonio-files-ui-common/mocks/handleFlagNodesRequest';
import handleGetAccountByEmailRequest from '../carbonio-files-ui-common/mocks/handleGetAccountByEmailRequest';
import handleGetBaseNodeRequest from '../carbonio-files-ui-common/mocks/handleGetBaseNodeRequest';
import handleGetChildrenRequest from '../carbonio-files-ui-common/mocks/handleGetChildrenRequest';
import handleGetChildRequest from '../carbonio-files-ui-common/mocks/handleGetChildRequest';
import handleGetCollaborationLinksRequest from '../carbonio-files-ui-common/mocks/handleGetCollaborationLinksRequest';
import handleGetLinksRequest from '../carbonio-files-ui-common/mocks/handleGetLinksRequest';
import handleGetNodeRequest from '../carbonio-files-ui-common/mocks/handleGetNodeRequest';
import handleGetPathRequest from '../carbonio-files-ui-common/mocks/handleGetPathRequest';
import handleGetPermissionsRequest from '../carbonio-files-ui-common/mocks/handleGetPermissionsRequest';
import handleGetPreviewRequest from '../carbonio-files-ui-common/mocks/handleGetPreviewRequest';
import handleGetRootsListRequest from '../carbonio-files-ui-common/mocks/handleGetRootsListRequest';
import handleGetSharesRequest from '../carbonio-files-ui-common/mocks/handleGetSharesRequest';
import handleGetVersionsRequest from '../carbonio-files-ui-common/mocks/handleGetVersionsRequest';
import handleIntrospectionRequest from '../carbonio-files-ui-common/mocks/handleIntrospectionRequest';
import handleMoveNodesRequest from '../carbonio-files-ui-common/mocks/handleMoveNodesRequest';
import handleMySelfQuotaRequest from '../carbonio-files-ui-common/mocks/handleMySelfQuotaRequest';
import handleRestoreNodesRequest from '../carbonio-files-ui-common/mocks/handleRestoreNodesRequest';
import handleTrashNodesRequest from '../carbonio-files-ui-common/mocks/handleTrashNodesRequest';
import handleUpdateLinkRequest from '../carbonio-files-ui-common/mocks/handleUpdateLinkRequest';
import handleUpdateNodeRequest from '../carbonio-files-ui-common/mocks/handleUpdateNodeRequest';
import handleUpdateShareRequest from '../carbonio-files-ui-common/mocks/handleUpdateShareRequest';
import handleUploadFileRequest from '../carbonio-files-ui-common/mocks/handleUploadFileRequest';
import handleUploadVersionRequest from '../carbonio-files-ui-common/mocks/handleUploadVersionRequest';
import {
	CopyNodesDocument,
	CreateFolderDocument,
	CreateLinkDocument,
	CreateShareDocument,
	DeleteLinksDocument,
	DeleteNodesDocument,
	DeleteShareDocument,
	FindNodesDocument,
	FlagNodesDocument,
	GetAccountByEmailDocument,
	GetBaseNodeDocument,
	GetChildDocument,
	GetChildrenDocument,
	GetCollaborationLinksDocument,
	GetLinksDocument,
	GetNodeDocument,
	GetPathDocument,
	GetPermissionsDocument,
	GetRootsListDocument,
	GetSharesDocument,
	GetVersionsDocument,
	MoveNodesDocument,
	RestoreNodesDocument,
	TrashNodesDocument,
	UpdateLinkDocument,
	UpdateNodeDescriptionDocument,
	UpdateNodeDocument,
	UpdateShareDocument
} from '../carbonio-files-ui-common/types/graphql/types';

const handlers: RequestHandler[] = [];

// queries
handlers.push(
	graphql.query('IntrospectionQuery', handleIntrospectionRequest),
	graphql.query(FindNodesDocument, handleFindNodesRequest),
	graphql.query(GetAccountByEmailDocument, handleGetAccountByEmailRequest),
	graphql.query(GetBaseNodeDocument, handleGetBaseNodeRequest),
	graphql.query(GetChildDocument, handleGetChildRequest),
	graphql.query(GetChildrenDocument, handleGetChildrenRequest),
	graphql.query(GetLinksDocument, handleGetLinksRequest),
	graphql.query(GetNodeDocument, handleGetNodeRequest),
	graphql.query(GetPathDocument, handleGetPathRequest),
	graphql.query(GetPermissionsDocument, handleGetPermissionsRequest),
	graphql.query(GetRootsListDocument, handleGetRootsListRequest),
	graphql.query(GetSharesDocument, handleGetSharesRequest),
	graphql.query(GetVersionsDocument, handleGetVersionsRequest),
	graphql.query(GetCollaborationLinksDocument, handleGetCollaborationLinksRequest)
);
// mutations
handlers.push(
	graphql.mutation(CopyNodesDocument, handleCopyNodesRequest),
	graphql.mutation(CreateFolderDocument, handleCreateFolderRequest),
	graphql.mutation(CreateLinkDocument, handleCreateLinkRequest),
	graphql.mutation(CreateShareDocument, handleCreateShareRequest),
	graphql.mutation(DeleteLinksDocument, handleDeleteLinksRequest),
	graphql.mutation(DeleteNodesDocument, handleDeleteNodesRequest),
	graphql.mutation(DeleteShareDocument, handleDeleteShareRequest),
	graphql.mutation(FlagNodesDocument, handleFlagNodesRequest),
	graphql.mutation(MoveNodesDocument, handleMoveNodesRequest),
	graphql.mutation(RestoreNodesDocument, handleRestoreNodesRequest),
	graphql.mutation(TrashNodesDocument, handleTrashNodesRequest),
	graphql.mutation(UpdateLinkDocument, handleUpdateLinkRequest),
	graphql.mutation(UpdateNodeDocument, handleUpdateNodeRequest),
	graphql.mutation(UpdateNodeDescriptionDocument, handleUpdateNodeRequest),
	graphql.mutation(UpdateShareDocument, handleUpdateShareRequest)
);
// rest
handlers.push(
	http.post(`${DOCS_ENDPOINT}${CREATE_FILE_PATH}`, handleCreateDocsFileRequest),
	http.post(`${REST_ENDPOINT}${UPLOAD_PATH}`, handleUploadFileRequest),
	http.post(`${REST_ENDPOINT}${UPLOAD_VERSION_PATH}`, handleUploadVersionRequest),
	http.get(
		`${REST_ENDPOINT}${PREVIEW_PATH}/:type/:id/:version/:area/:thumbnail`,
		handleGetPreviewRequest
	),
	http.get(`${REST_ENDPOINT}${PREVIEW_PATH}/:type/:id/:version`, handleGetPreviewRequest),
	http.get(`${STORAGES_ENDPOINT}${MYSELF_QUOTA_PATH}`, handleMySelfQuotaRequest)
);

export default handlers;
