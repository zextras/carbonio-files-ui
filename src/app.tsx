/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { lazy, useEffect, Suspense, useCallback, useMemo } from 'react';

import { ApolloProvider } from '@apollo/client';
import {
	Spinner,
	addRoute,
	addSearchView,
	registerActions,
	ACTION_TYPES,
	SecondaryBarComponentProps,
	SearchViewProps
} from '@zextras/carbonio-shell-ui';
import { filter, size } from 'lodash';
import { useTranslation } from 'react-i18next';

import buildClient from './carbonio-files-ui-common/apollo';
import { uploadVar } from './carbonio-files-ui-common/apollo/uploadVar';
import { FILES_APP_ID, FILES_ROUTE, ROOTS } from './carbonio-files-ui-common/constants';
import { useUpload } from './carbonio-files-ui-common/hooks/useUpload';
import { UploadStatus } from './carbonio-files-ui-common/types/graphql/client-types';
import { getUploadAddTypeFromInput } from './carbonio-files-ui-common/utils/uploadUtils';
import { inputElement } from './carbonio-files-ui-common/utils/utils';
import { AppErrorCatcher } from './components/AppErrorCatcher';
import { IntegrationsRegisterer } from './integrations/IntegrationsRegisterer';

const LazyAppView = lazy(() => import(/* webpackChunkName: "appView" */ './views/AppView'));

const LazySidebarView = lazy(
	() => import(/* webpackChunkName: "sidebarView" */ './views/SidebarView')
);

const LazySearchView = lazy(
	() => import(/* webpackChunkName: "SearchView" */ './views/SearchView')
);

const AppView = (): JSX.Element => (
	<Suspense fallback={<Spinner />}>
		<AppErrorCatcher>
			<LazyAppView />
		</AppErrorCatcher>
	</Suspense>
);

const SidebarView = (props: SecondaryBarComponentProps): JSX.Element => (
	<Suspense fallback={<Spinner />}>
		<AppErrorCatcher>
			<LazySidebarView {...props} />
		</AppErrorCatcher>
	</Suspense>
);

const SearchView = (props: SearchViewProps): JSX.Element => (
	<Suspense fallback={<Spinner />}>
		<AppErrorCatcher>
			<LazySearchView {...props} />
		</AppErrorCatcher>
	</Suspense>
);

export default function App(): JSX.Element {
	const [t] = useTranslation();

	const beforeunloadCallback = useCallback((e) => {
		if (size(filter(uploadVar(), (value) => value.status === UploadStatus.LOADING)) > 0) {
			// Cancel the event
			e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
			// Chrome requires returnValue to be set
			e.returnValue = '';
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
			position: 9,
			visible: true,
			label: t('label.app_name', 'Files'),
			primaryBar: 'DriveOutline',
			secondaryBar: SidebarView,
			appView: AppView
		});
		addSearchView({
			route: FILES_ROUTE,
			component: SearchView
		});
		registerActions({
			action: () => ({
				id: 'upload-file',
				label: t('create.options.new.upload', 'Upload'),
				icon: 'CloudUploadOutline',
				click: uploadClick,
				disabled: false,
				primary: true,
				group: FILES_APP_ID,
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				type: ACTION_TYPES.NEW
			}),
			id: 'upload-file',
			type: ACTION_TYPES.NEW
		});
	}, [uploadClick, t]);

	const apolloClient = useMemo(() => buildClient(), []);

	return (
		<ApolloProvider client={apolloClient}>
			<IntegrationsRegisterer />
		</ApolloProvider>
	);
}
