/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { lazy, Suspense, useCallback, useEffect, useMemo } from 'react';

import { Spinner } from '@zextras/carbonio-shell-ui';
import { Route, Switch, useRouteMatch } from 'react-router-dom';

import buildClient from '../carbonio-files-ui-common/apollo';
import { INTERNAL_PATH } from '../carbonio-files-ui-common/constants';
import { URLParams } from '../carbonio-files-ui-common/types/common';
import { PreventDefaultDropContainer } from '../carbonio-files-ui-common/views/components/PreventDefaultDropContainer';
import {
	GlobalProvidersWrapper,
	ViewProvidersWrapper
} from '../carbonio-files-ui-common/views/components/ProvidersWrapper';
import { UPDATE_VIEW_EVENT } from '../constants';

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

const View = (): React.JSX.Element | null => {
	const { path, params } = useRouteMatch<URLParams>();
	return (
		(`/${params.view}` === INTERNAL_PATH.ROOT && (
			<Route path={`${path}/:rootId`}>
				<Suspense fallback={<Spinner />}>
					<ViewProvidersWrapper>
						<LazyFolderView />
					</ViewProvidersWrapper>
				</Suspense>
			</Route>
		)) ||
		(`/${params.view}` === INTERNAL_PATH.FILTER && (
			<Route path={`${path}/:filter?`}>
				<Suspense fallback={<Spinner />}>
					<ViewProvidersWrapper>
						<LazyFilterView />
					</ViewProvidersWrapper>
				</Suspense>
			</Route>
		)) || (
			<Route path={path}>
				<Suspense fallback={<Spinner />}>
					<ViewProvidersWrapper>
						<LazyUploadView />
					</ViewProvidersWrapper>
				</Suspense>
			</Route>
		)
	);
};

const AppView: React.VFC = () => {
	const { path } = useRouteMatch<URLParams>();

	const apolloClient = useMemo(() => buildClient(), []);

	const clearApolloCache = useCallback(() => {
		apolloClient.resetStore();
	}, [apolloClient]);

	useEffect(() => {
		window.addEventListener(UPDATE_VIEW_EVENT, clearApolloCache);

		return (): void => {
			window.removeEventListener(UPDATE_VIEW_EVENT, clearApolloCache);
		};
	}, [clearApolloCache]);

	return (
		<PreventDefaultDropContainer>
			<GlobalProvidersWrapper>
				<Switch>
					<Route path={`${path}/:view`}>
						<View />
					</Route>
					<Route path={`${path}/`}>
						<Suspense fallback={<Spinner />}>
							<ViewProvidersWrapper>
								<LazyFileFolderViewSelector />
							</ViewProvidersWrapper>
						</Suspense>
					</Route>
				</Switch>
			</GlobalProvidersWrapper>
		</PreventDefaultDropContainer>
	);
};

export default AppView;
