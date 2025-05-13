/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { lazy, Suspense, useCallback, useEffect, useMemo } from 'react';

import { ApolloProvider } from '@apollo/client';
import { ModalManager } from '@zextras/carbonio-design-system';
import type { SearchViewProps } from '@zextras/carbonio-search-ui';
import {
	ACTION_TYPES,
	addRoute,
	NewAction,
	registerActions,
	SecondaryBarComponentProps,
	useAuthenticated,
	useIntegratedFunction
} from '@zextras/carbonio-shell-ui';
import { useTranslation } from 'react-i18next';

import buildClient from './carbonio-files-ui-common/apollo';
import { uploadVar } from './carbonio-files-ui-common/apollo/uploadVar';
import { FILES_APP_ID, FILES_ROUTE, ROOTS } from './carbonio-files-ui-common/constants';
import { useUpload } from './carbonio-files-ui-common/hooks/useUpload';
import { UploadStatus } from './carbonio-files-ui-common/types/graphql/client-types';
import { getUploadAddTypeFromInput } from './carbonio-files-ui-common/utils/uploadUtils';
import { inputElement } from './carbonio-files-ui-common/utils/utils';
import { AppErrorCatcher } from './components/AppErrorCatcher';
import { PrimaryBadgeUpdater } from './components/PrimaryBadgeUpdater';
import { Spinner } from './components/Spinner';
import { IntegrationsRegisterer } from './integrations/IntegrationsRegisterer';

const LazyAppView = lazy(() => import(/* webpackChunkName: "appView" */ './views/AppView'));

const LazySidebarView = lazy(
	() => import(/* webpackChunkName: "sidebarView" */ './views/SidebarView')
);

const LazySearchView = lazy(
	() => import(/* webpackChunkName: "SearchView" */ './views/SearchView')
);

const AppView = (): React.JSX.Element => (
	<Suspense fallback={<Spinner />}>
		<AppErrorCatcher>
			<LazyAppView />
		</AppErrorCatcher>
	</Suspense>
);

const SidebarView = (props: SecondaryBarComponentProps): React.JSX.Element => (
	<Suspense fallback={<Spinner />}>
		<AppErrorCatcher>
			<LazySidebarView {...props} />
		</AppErrorCatcher>
	</Suspense>
);

const SearchView = (props: SearchViewProps): React.JSX.Element => (
	<Suspense fallback={<Spinner />}>
		<AppErrorCatcher>
			<LazySearchView {...props} />
		</AppErrorCatcher>
	</Suspense>
);

export function AuthenticatedApp(): React.JSX.Element {
	const [t] = useTranslation();
	const [addSearchView, isAddSearchViewAvailable] = useIntegratedFunction('search-add-view');
	const [removeSearchView, isRemoveSearchViewAvailable] =
		useIntegratedFunction('search-remove-view');

	const appInfo = useMemo(
		() => ({
			id: FILES_APP_ID,
			app: FILES_APP_ID,
			route: FILES_ROUTE,
			label: t('label.app_name', 'Files'),
			icon: 'DriveOutline',
			position: 500
		}),
		[t]
	);

	const beforeunloadCallback = useCallback((e: Event) => {
		if (
			Object.values(uploadVar()).filter((value) => value.status === UploadStatus.LOADING).length > 0
		) {
			// Cancel the event
			e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
		}
	}, []);

	useEffect(() => {
		window.addEventListener('beforeunload', beforeunloadCallback);
	}, [beforeunloadCallback]);
	const { add } = useUpload();

	const inputElementOnchange = useCallback(
		(ev: Event) => {
			if (ev.currentTarget instanceof HTMLInputElement) {
				if (ev.currentTarget.files) {
					add(getUploadAddTypeFromInput(ev.currentTarget.files), ROOTS.LOCAL_ROOT);
				}
				// required to select 2 times the same file/files
				ev.currentTarget.value = '';
			}
		},
		[add]
	);

	const uploadClick = useCallback(() => {
		inputElement.click();
		inputElement.onchange = inputElementOnchange;
	}, [inputElementOnchange]);

	const newAction = useMemo(
		(): NewAction => ({
			id: 'upload-file',
			label: t('create.options.new.upload', 'Upload'),
			icon: 'CloudUploadOutline',
			execute: uploadClick,
			disabled: false,
			primary: true,
			group: FILES_APP_ID
		}),
		[t, uploadClick]
	);

	useEffect(() => {
		addRoute({
			...appInfo,
			primaryBar: 'DriveOutline',
			visible: true,
			secondaryBar: SidebarView,
			appView: AppView
		});
		registerActions<NewAction>({
			action: () => newAction,
			id: 'upload-file',
			type: ACTION_TYPES.NEW
		});
	}, [newAction, appInfo]);

	useEffect(() => {
		if (isAddSearchViewAvailable) {
			addSearchView({
				...appInfo,
				component: SearchView
			});
		}

		return () => {
			if (isRemoveSearchViewAvailable) {
				removeSearchView();
			}
		};
	}, [
		addSearchView,
		appInfo,
		isAddSearchViewAvailable,
		isRemoveSearchViewAvailable,
		removeSearchView
	]);

	const apolloClient = useMemo(() => buildClient(), []);

	return (
		<ApolloProvider client={apolloClient}>
			<ModalManager>
				<IntegrationsRegisterer />
				<PrimaryBadgeUpdater />
			</ModalManager>
		</ApolloProvider>
	);
}

function App(): React.JSX.Element | null {
	const isAuthenticated = useAuthenticated();

	return isAuthenticated ? <AuthenticatedApp /> : null;
}

export default App;
