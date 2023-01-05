/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { lazy, Suspense } from 'react';

import { Spinner } from '@zextras/carbonio-shell-ui';
import { Route, Switch, useRouteMatch } from 'react-router-dom';

import { INTERNAL_PATH } from '../carbonio-files-ui-common/constants';
import { URLParams } from '../carbonio-files-ui-common/types/common';
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

const View = (): JSX.Element | null => {
	const { path, params } = useRouteMatch<URLParams>();
	return (
		(`/${params.view}` === INTERNAL_PATH.ROOT && (
			<Route path={`${path}/:rootId`}>
				<Suspense fallback={<Spinner />}>
					<LazyFolderView />
				</Suspense>
			</Route>
		)) ||
		(`/${params.view}` === INTERNAL_PATH.FILTER && (
			<Route path={`${path}/:filter?`}>
				<Suspense fallback={<Spinner />}>
					<LazyFilterView />
				</Suspense>
			</Route>
		)) || (
			<Route path={path}>
				<Suspense fallback={<Spinner />}>
					<LazyUploadView />
				</Suspense>
			</Route>
		)
	);
};

const AppView: React.VFC = () => {
	const { path } = useRouteMatch<URLParams>();

	return (
		<PreventDefaultDropContainer>
			<ProvidersWrapper>
				<Switch>
					<Route path={`${path}/:view`}>
						<View />
					</Route>
					<Route path={`${path}/`}>
						<Suspense fallback={<Spinner />}>
							<LazyFileFolderViewSelector />
						</Suspense>
					</Route>
				</Switch>
			</ProvidersWrapper>
		</PreventDefaultDropContainer>
	);
};

export default AppView;
