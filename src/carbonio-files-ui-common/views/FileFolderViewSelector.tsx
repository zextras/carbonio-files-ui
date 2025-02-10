/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { lazy } from 'react';

import { Navigate } from 'react-router-dom';

import { ROOTS } from '../constants';
import useQueryParam from '../hooks/useQueryParam';

const LazyFolderView = lazy(() => import(/* webpackChunkName: "folderView" */ './FolderView'));

const LazyFileView = lazy(() => import(/* webpackChunkName: "fileView" */ './FileView'));

const FileFolderViewSelector = (): React.JSX.Element => {
	const folderId = useQueryParam('folder');
	const fileId = useQueryParam('file');

	if (folderId) {
		return <LazyFolderView />;
	}
	if (fileId) {
		return <LazyFileView />;
	}
	return <Navigate to={`root/${ROOTS.LOCAL_ROOT}`} replace />;
};

export default FileFolderViewSelector;
