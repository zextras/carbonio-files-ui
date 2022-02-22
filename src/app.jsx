/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { lazy, useEffect, Suspense, useCallback } from 'react';

import {
	Spinner,
	addRoute,
	addSearchView,
	registerActions,
	ACTION_TYPES,
	SHELL_APP_ID
} from '@zextras/carbonio-shell-ui';
import filter from 'lodash/filter';
import size from 'lodash/size';
import { useTranslation } from 'react-i18next';

import { uploadVar } from './carbonio-files-ui-common/apollo/uploadVar';
import { ROOTS } from './carbonio-files-ui-common/constants';
import { useUpload } from './carbonio-files-ui-common/hooks/useUpload';
import { UploadStatus } from './carbonio-files-ui-common/types/common';
import { inputElement } from './carbonio-files-ui-common/utils/utils';
import { AppErrorCatcher } from './components/AppErrorCatcher';
import { FILES_ROUTE } from './constants';

const LazyAppView = lazy(() => import(/* webpackChunkName: "appView" */ './views/AppView'));

const LazySidebarView = lazy(() =>
	import(/* webpackChunkName: "sidebarView" */ './views/SidebarView')
);

const LazySearchView = lazy(() =>
	import(/* webpackChunkName: "SearchView" */ './views/SearchView')
);

const AppView = () => (
	<Suspense fallback={<Spinner />}>
		<AppErrorCatcher>
			<LazyAppView />
		</AppErrorCatcher>
	</Suspense>
);

const SidebarView = (props) => (
	<Suspense fallback={<Spinner />}>
		<AppErrorCatcher>
			<LazySidebarView {...props} />
		</AppErrorCatcher>
	</Suspense>
);

const SearchView = (props) => (
	<Suspense fallback={<Spinner />}>
		<AppErrorCatcher>
			<LazySearchView {...props} />
		</AppErrorCatcher>
	</Suspense>
);

export default function App() {
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
		(ev) => {
			add(ev.currentTarget.files, ROOTS.LOCAL_ROOT);
			// require to select 2 times the same file/files
			// eslint-disable-next-line no-param-reassign
			ev.target.value = '';
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
			action: (route) => ({
				id: 'upload-file',
				label: t('create.options.new.upload', 'Upload'),
				icon: 'CloudUploadOutline',
				click: uploadClick,
				disabled: false,
				primary: true,
				group: SHELL_APP_ID
			}),
			id: 'upload-file',
			type: ACTION_TYPES.NEW
		});
		// 	registerAppData({
		// 		icon: 'DriveOutline',
		// 		views: {
		// 			app: AppView,
		// 			// settings: SettingsView,
		// 			// board: BoardView,
		// 			search: SearchView,
		// 			sidebar: SidebarView
		// 		},
		// 		context: {},
		// 		newButton: {
		// 			primary: {
		// 				id: 'upload-file',
		// 				label: t('create.options.new.upload', 'Upload'),
		// 				icon: 'CloudUploadOutline',
		// 				disabled: false,
		// 				click: uploadClick
		// 			},
		// 			secondaryItems: []
		// 		}
		// 	});
	}, [uploadClick, t]);

	return null;
}
