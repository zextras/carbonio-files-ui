/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { lazy, useEffect, Suspense, useCallback, useMemo } from 'react';

import { ApolloProvider } from '@apollo/client';
import { ModalManager } from '@zextras/carbonio-design-system';
import {
	Spinner,
	addRoute,
	addSearchView,
	registerActions,
	ACTION_TYPES,
	SecondaryBarComponentProps,
	SearchViewProps,
	upsertApp
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
import { PrimaryBarElement } from './components/PrimaryBarElement';
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

export default function App(): React.JSX.Element {
	const [t] = useTranslation();

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

	useEffect(() => {
		addRoute({
			route: FILES_ROUTE,
			position: 500,
			visible: true,
			label: t('label.app_name', 'Files'),
			primaryBar: PrimaryBarElement,
			secondaryBar: SidebarView,
			appView: AppView
		});
		upsertApp({
			name: FILES_APP_ID,
			display: t('label.app_name', 'Files'),
			description: t('label.app_description', 'Files module')
		});
		addSearchView({
			route: FILES_ROUTE,
			component: SearchView,
			label: t('label.app_name', 'Files')
		});
		registerActions({
			action: () => ({
				id: 'upload-file',
				label: t('create.options.new.upload', 'Upload'),
				icon: 'CloudUploadOutline',
				onClick: uploadClick,
				disabled: false,
				primary: true,
				group: FILES_APP_ID
			}),
			id: 'upload-file',
			type: ACTION_TYPES.NEW
		});
	}, [uploadClick, t]);

	const apolloClient = useMemo(() => buildClient(), []);

	return (
		<ApolloProvider client={apolloClient}>
			<ModalManager>
				<IntegrationsRegisterer />
			</ModalManager>
		</ApolloProvider>
	);
}
