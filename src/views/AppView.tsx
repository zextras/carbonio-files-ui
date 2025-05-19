/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { lazy, Suspense, useCallback, useEffect, useMemo } from 'react';

import { Route, Routes } from 'react-router-dom';

import buildClient from '../carbonio-files-ui-common/apollo';
import { INTERNAL_PATH } from '../carbonio-files-ui-common/constants';
import { GetNotificationsDocument } from '../carbonio-files-ui-common/types/graphql/types';
import { PreventDefaultDropContainer } from '../carbonio-files-ui-common/views/components/PreventDefaultDropContainer';
import {
	GlobalProvidersWrapper,
	ViewProvidersWrapper
} from '../carbonio-files-ui-common/views/components/ProvidersWrapper';
import { Spinner } from '../components/Spinner';
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

const AppView = (): React.JSX.Element => {
	const apolloClient = useMemo(() => buildClient(), []);

	const clearApolloCache = useCallback(async () => {
		await apolloClient.resetStore();
		apolloClient.query({
			query: GetNotificationsDocument,
			variables: {
				update_last_seen: false
			},
			fetchPolicy: 'network-only'
		});
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
				<Routes>
					<Route
						path={`${INTERNAL_PATH.ROOT}/:rootId`}
						element={
							<Suspense fallback={<Spinner />}>
								<ViewProvidersWrapper>
									<LazyFolderView />
								</ViewProvidersWrapper>
							</Suspense>
						}
					/>
					<Route
						path={`${INTERNAL_PATH.FILTER}/:filter?`}
						element={
							<Suspense fallback={<Spinner />}>
								<ViewProvidersWrapper>
									<LazyFilterView />
								</ViewProvidersWrapper>
							</Suspense>
						}
					/>
					<Route
						path={`${INTERNAL_PATH.UPLOADS}`}
						element={
							<Suspense fallback={<Spinner />}>
								<ViewProvidersWrapper>
									<LazyUploadView />
								</ViewProvidersWrapper>
							</Suspense>
						}
					/>
					)
					<Route
						path={`/`}
						element={
							<Suspense fallback={<Spinner />}>
								<ViewProvidersWrapper>
									<LazyFileFolderViewSelector />
								</ViewProvidersWrapper>
							</Suspense>
						}
					/>
				</Routes>
			</GlobalProvidersWrapper>
		</PreventDefaultDropContainer>
	);
};

export default AppView;
