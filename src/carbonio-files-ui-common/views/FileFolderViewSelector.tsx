/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { lazy } from 'react';

import { Redirect, useRouteMatch } from 'react-router-dom';

import { ROOTS } from '../constants';
import useQueryParam from '../hooks/useQueryParam';

const LazyFolderView = lazy(() => import(/* webpackChunkName: "folderView" */ './FolderView'));

const LazyFileView = lazy(() => import(/* webpackChunkName: "fileView" */ './FileView'));

const FileFolderViewSelector: React.VFC = () => {
	const folderId = useQueryParam('folder');
	const fileId = useQueryParam('file');
	const { path } = useRouteMatch();

	if (folderId) {
		return <LazyFolderView />;
	}
	if (fileId) {
		return <LazyFileView />;
	}
	return <Redirect to={`${path}root/${ROOTS.LOCAL_ROOT}`} />;
};

export default FileFolderViewSelector;
