/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { graphql, RequestHandler, rest } from 'msw';

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

const handlers: RequestHandler[] = [];

// queries
handlers.push(
	graphql.query('IntrospectionQuery', handleIntrospectionRequest),
	graphql.query('findNodes', handleFindNodesRequest),
	graphql.query('getAccountByEmail', handleGetAccountByEmailRequest),
	graphql.query('getBaseNode', handleGetBaseNodeRequest),
	graphql.query('getChild', handleGetChildRequest),
	graphql.query('getChildren', handleGetChildrenRequest),
	graphql.query('getLinks', handleGetLinksRequest),
	graphql.query('getNode', handleGetNodeRequest),
	graphql.query('getPath', handleGetPathRequest),
	graphql.query('getPermissions', handleGetPermissionsRequest),
	graphql.query('getRootsList', handleGetRootsListRequest),
	graphql.query('getShares', handleGetSharesRequest),
	graphql.query('getVersions', handleGetVersionsRequest),
	graphql.query('getCollaborationLinks', handleGetCollaborationLinksRequest)
);
// mutations
handlers.push(
	graphql.mutation('copyNodes', handleCopyNodesRequest),
	graphql.mutation('createFolder', handleCreateFolderRequest),
	graphql.mutation('createLink', handleCreateLinkRequest),
	graphql.mutation('createShare', handleCreateShareRequest),
	graphql.mutation('deleteLinks', handleDeleteLinksRequest),
	graphql.mutation('deleteNodes', handleDeleteNodesRequest),
	graphql.mutation('deleteShare', handleDeleteShareRequest),
	graphql.mutation('flagNodes', handleFlagNodesRequest),
	graphql.mutation('moveNodes', handleMoveNodesRequest),
	graphql.mutation('restoreNodes', handleRestoreNodesRequest),
	graphql.mutation('trashNodes', handleTrashNodesRequest),
	graphql.mutation('updateLink', handleUpdateLinkRequest),
	graphql.mutation('updateNode', handleUpdateNodeRequest),
	graphql.mutation('updateNodeDescription', handleUpdateNodeRequest),
	graphql.mutation('updateShare', handleUpdateShareRequest)
);
// rest
handlers.push(
	rest.post(`${DOCS_ENDPOINT}${CREATE_FILE_PATH}`, handleCreateDocsFileRequest),
	rest.post(`${REST_ENDPOINT}${UPLOAD_PATH}`, handleUploadFileRequest),
	rest.post(`${REST_ENDPOINT}${UPLOAD_VERSION_PATH}`, handleUploadVersionRequest),
	rest.get(
		`${REST_ENDPOINT}${PREVIEW_PATH}/:type/:id/:version/:area/:thumbnail`,
		handleGetPreviewRequest
	),
	rest.get(`${STORAGES_ENDPOINT}${MYSELF_QUOTA_PATH}`, handleMySelfQuotaRequest)
);

export default handlers;
