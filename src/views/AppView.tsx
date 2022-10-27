/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { lazy, Suspense } from 'react';

import { Spinner } from '@zextras/carbonio-shell-ui';
import { Route, Switch, useRouteMatch } from 'react-router-dom';

import { INTERNAL_PATH } from '../carbonio-files-ui-common/constants';
import { PreventDefaultDropContainer } from '../carbonio-files-ui-common/views/components/PreventDefaultDropContainer';
import { ProvidersWrapper } from '../carbonio-files-ui-common/views/components/ProvidersWrapper';

const LazyFileFolderViewSelector = lazy(
	() =>
		import(
			/* webpackChunkName: "fileFolderViewSelector" */ '../carbonio-files-ui-common/views/FileFolderViewSelector'
		)
);

const LazyFolderView = lazy(
	() => import(/* webpackChunkName: "folderView" */ '../carbonio-files-ui-common/views/FolderView')
);

const LazyFilterView = lazy(
	() => import(/* webpackChunkName: "filterView" */ '../carbonio-files-ui-common/views/FilterView')
);

const LazyUploadView = lazy(
	() => import(/* webpackChunkName: "uploadView" */ '../carbonio-files-ui-common/views/UploadView')
);

const AppView: React.VFC = () => {
	const { path } = useRouteMatch();
	return (
		<PreventDefaultDropContainer>
			<ProvidersWrapper>
				<Switch>
					<Route path={`${path}/`} exact>
						<Suspense fallback={<Spinner />}>
							<LazyFileFolderViewSelector />
						</Suspense>
					</Route>

					<Route path={`${path}${INTERNAL_PATH.ROOT}/:rootId`}>
						<Suspense fallback={<Spinner />}>
							<LazyFolderView />
						</Suspense>
					</Route>

					<Route path={`${path}${INTERNAL_PATH.FILTER}/:filter?`}>
						<Suspense fallback={<Spinner />}>
							<LazyFilterView />
						</Suspense>
					</Route>

					<Route path={`${path}${INTERNAL_PATH.UPLOADS}`}>
						<Suspense fallback={<Spinner />}>
							<LazyUploadView />
						</Suspense>
					</Route>
				</Switch>
			</ProvidersWrapper>
		</PreventDefaultDropContainer>
	);
};

export default AppView;
