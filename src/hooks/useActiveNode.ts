/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { includes } from 'lodash';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useNavigation } from './useNavigation';
import { DISPLAYER_TABS } from '../carbonio-files-ui-common/constants';
import useQueryParam from '../carbonio-files-ui-common/hooks/useQueryParam';
import { URLParams } from '../carbonio-files-ui-common/types/common';
import { isSearchView } from '../carbonio-files-ui-common/utils/utils';

export function useActiveNode(): {
	activeNodeId?: string;
	tab?: string;
	setActiveNode: (newId: string, newTab?: string) => void;
	removeActiveNode: () => void;
	isDetailsTab: boolean;
	isSharingTab: boolean;
	isVersioningTab: boolean;
	isExistingTab: boolean;
} {
	const { navigateTo } = useNavigation();

	const location = useLocation();
	const navigate = useNavigate();
	const activeNodeId = useQueryParam('node');
	const tab = useQueryParam('tab');

	const { rootId, filter, view = '' } = useParams<URLParams>();
	const folderId = useQueryParam('folder');
	const fileId = useQueryParam('file');
	const inSearchView = isSearchView(location);

	const setActiveNode = useCallback(
		(newId: string, newTab?: string) => {
			const queryParams: string[] = [];
			if (folderId) {
				queryParams.push(`folder=${folderId}`);
			} else if (fileId) {
				queryParams.push(`file=${fileId}`);
			}
			queryParams.push(`node=${newId}`);

			if (newTab) {
				queryParams.push(`tab=${newTab}`);
			}

			navigate({ search: queryParams.join('&') }, { replace: true });
		},
		[fileId, folderId, navigate]
	);

	const removeActiveNode = useCallback(() => {
		// TODO maybe this can be simplified
		// navigate({ search: '' }, { replace: true });
		if (inSearchView) {
			const destination = `${location.pathname}`;
			navigate(destination, { replace: true });
		} else {
			let params = '';
			if (rootId) {
				params += `/${rootId}`;
			} else if (filter) {
				params += `/${filter}/`;
			}
			let queryParams = '?';
			if (folderId) {
				queryParams += `folder=${folderId}`;
			}
			const destination = `/${view}${params}${queryParams}`;
			navigateTo(destination, true);
		}
	}, [inSearchView, location.pathname, navigate, rootId, filter, folderId, view, navigateTo]);

	return {
		activeNodeId,
		tab,
		setActiveNode,
		removeActiveNode,
		isDetailsTab: tab === DISPLAYER_TABS.details,
		isSharingTab: tab === DISPLAYER_TABS.sharing,
		isVersioningTab: tab === DISPLAYER_TABS.versioning,
		isExistingTab: includes(DISPLAYER_TABS, tab)
	};
}
