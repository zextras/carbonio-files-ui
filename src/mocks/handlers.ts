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
	MYSELF_QUOTA_PATH,
	HEALTH_PATH,
	DOWNLOAD_PATH,
	DOWNLOAD_PATH_CHECK,
	DOWNLOAD_MULTIPLE_PATH
} from '../carbonio-files-ui-common/constants';
import handleCopyNodesRequest from '../carbonio-files-ui-common/mocks/handleCopyNodesRequest';
import handleCreateDocsFileRequest from '../carbonio-files-ui-common/mocks/handleCreateDocsFileRequest';
import handleCreateFolderRequest from '../carbonio-files-ui-common/mocks/handleCreateFolderRequest';
import handleCreateLinkRequest from '../carbonio-files-ui-common/mocks/handleCreateLinkRequest';
import handleCreateShareRequest from '../carbonio-files-ui-common/mocks/handleCreateShareRequest';
import handleDeleteLinksRequest from '../carbonio-files-ui-common/mocks/handleDeleteLinkRequest';
import handleDeleteNodesRequest from '../carbonio-files-ui-common/mocks/handleDeleteNodesRequest';
import handleDeleteSharesRequest from '../carbonio-files-ui-common/mocks/handleDeleteSharesRequest';
import handleDownloadCheckRequest from '../carbonio-files-ui-common/mocks/handleDownloadCheckRequest';
import handleDownloadMultipleCheckRequest from '../carbonio-files-ui-common/mocks/handleDownloadMultipleCheckRequest';
import handleFindNodesRequest from '../carbonio-files-ui-common/mocks/handleFindNodesRequest';
import handleFlagNodesRequest from '../carbonio-files-ui-common/mocks/handleFlagNodesRequest';
import handleGetAccountByEmailRequest from '../carbonio-files-ui-common/mocks/handleGetAccountByEmailRequest';
import handleGetBaseNodeRequest from '../carbonio-files-ui-common/mocks/handleGetBaseNodeRequest';
import handleGetChildrenRequest from '../carbonio-files-ui-common/mocks/handleGetChildrenRequest';
import handleGetChildRequest from '../carbonio-files-ui-common/mocks/handleGetChildRequest';
import handleGetCollaborationLinksRequest from '../carbonio-files-ui-common/mocks/handleGetCollaborationLinksRequest';
import handleGetConfigsRequest from '../carbonio-files-ui-common/mocks/handleGetConfigsRequest';
import handleGetLinksRequest from '../carbonio-files-ui-common/mocks/handleGetLinksRequest';
import handleGetNodeRequest from '../carbonio-files-ui-common/mocks/handleGetNodeRequest';
import handleGetNotificationsRequest from '../carbonio-files-ui-common/mocks/handleGetNotificationsRequest';
import handleGetPathRequest from '../carbonio-files-ui-common/mocks/handleGetPathRequest';
import handleGetPermissionsRequest from '../carbonio-files-ui-common/mocks/handleGetPermissionsRequest';
import handleGetPreviewRequest from '../carbonio-files-ui-common/mocks/handleGetPreviewRequest';
import handleGetRootsListRequest from '../carbonio-files-ui-common/mocks/handleGetRootsListRequest';
import handleGetSharesRequest from '../carbonio-files-ui-common/mocks/handleGetSharesRequest';
import handleGetVersionsRequest from '../carbonio-files-ui-common/mocks/handleGetVersionsRequest';
import handleHealthRequest from '../carbonio-files-ui-common/mocks/handleHealthRequest';
import handleIntrospectionRequest from '../carbonio-files-ui-common/mocks/handleIntrospectionRequest';
import handleMoveNodesRequest from '../carbonio-files-ui-common/mocks/handleMoveNodesRequest';
import handleMySelfQuotaRequest from '../carbonio-files-ui-common/mocks/handleMySelfQuotaRequest';
import handleRestoreNodesRequest from '../carbonio-files-ui-common/mocks/handleRestoreNodesRequest';
import handleTrashNodesRequest from '../carbonio-files-ui-common/mocks/handleTrashNodesRequest';
import handleUpdateLinkRequest from '../carbonio-files-ui-common/mocks/handleUpdateLinkRequest';
import handleUpdateNodeRequest from '../carbonio-files-ui-common/mocks/handleUpdateNodeRequest';
import handleUpdateSharesRequest from '../carbonio-files-ui-common/mocks/handleUpdateSharesRequest';
import handleUploadFileRequest from '../carbonio-files-ui-common/mocks/handleUploadFileRequest';
import handleUploadVersionRequest from '../carbonio-files-ui-common/mocks/handleUploadVersionRequest';
import {
	CopyNodesDocument,
	CreateFolderDocument,
	CreateLinkDocument,
	CreateShareDocument,
	DeleteLinksDocument,
	DeleteNodesDocument,
	DeleteSharesDocument,
	FindNodesDocument,
	FlagNodesDocument,
	GetAccountByEmailDocument,
	GetBaseNodeDocument,
	GetCeNotificationsDocument,
	GetChildDocument,
	GetChildrenDocument,
	GetCollaborationLinksDocument,
	GetConfigsDocument,
	GetLinksDocument,
	GetNodeDocument,
	GetNotificationsDocument,
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
	UpdateSharesDocument
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
	graphql.query(GetCollaborationLinksDocument, handleGetCollaborationLinksRequest),
	graphql.query(GetNotificationsDocument, handleGetNotificationsRequest),
	graphql.query(GetCeNotificationsDocument, handleGetNotificationsRequest),
	graphql.query(GetConfigsDocument, handleGetConfigsRequest)
);
// mutations
handlers.push(
	graphql.mutation(CopyNodesDocument, handleCopyNodesRequest),
	graphql.mutation(CreateFolderDocument, handleCreateFolderRequest),
	graphql.mutation(CreateLinkDocument, handleCreateLinkRequest),
	graphql.mutation(CreateShareDocument, handleCreateShareRequest),
	graphql.mutation(DeleteLinksDocument, handleDeleteLinksRequest),
	graphql.mutation(DeleteNodesDocument, handleDeleteNodesRequest),
	graphql.mutation(DeleteSharesDocument, handleDeleteSharesRequest),
	graphql.mutation(FlagNodesDocument, handleFlagNodesRequest),
	graphql.mutation(MoveNodesDocument, handleMoveNodesRequest),
	graphql.mutation(RestoreNodesDocument, handleRestoreNodesRequest),
	graphql.mutation(TrashNodesDocument, handleTrashNodesRequest),
	graphql.mutation(UpdateLinkDocument, handleUpdateLinkRequest),
	graphql.mutation(UpdateNodeDocument, handleUpdateNodeRequest),
	graphql.mutation(UpdateNodeDescriptionDocument, handleUpdateNodeRequest),
	graphql.mutation(UpdateSharesDocument, handleUpdateSharesRequest)
);
// rest
handlers.push(
	http.post(`${DOCS_ENDPOINT}${CREATE_FILE_PATH}`, handleCreateDocsFileRequest),
	http.post(`${REST_ENDPOINT}${UPLOAD_PATH}`, handleUploadFileRequest),
	http.post(`${REST_ENDPOINT}${UPLOAD_VERSION_PATH}`, handleUploadVersionRequest),
	http.get(`${REST_ENDPOINT}${PREVIEW_PATH}/:type/:id/:area/:thumbnail`, handleGetPreviewRequest),
	http.get(`${REST_ENDPOINT}${PREVIEW_PATH}/:type/:id`, handleGetPreviewRequest),
	http.get(`${STORAGES_ENDPOINT}${MYSELF_QUOTA_PATH}`, handleMySelfQuotaRequest),
	http.get(`${REST_ENDPOINT}${HEALTH_PATH}`, handleHealthRequest),
	http.get(
		`${REST_ENDPOINT}${DOWNLOAD_PATH}/:id${DOWNLOAD_PATH_CHECK}`,
		handleDownloadCheckRequest
	),
	http.post(
		`${REST_ENDPOINT}${DOWNLOAD_MULTIPLE_PATH}${DOWNLOAD_PATH_CHECK}`,
		handleDownloadMultipleCheckRequest
	)
);

export default handlers;
