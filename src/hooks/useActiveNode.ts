/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { includes } from 'lodash';
import { useHistory, useParams } from 'react-router-dom';

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

	const activeNodeId = useQueryParam('node');
	const tab = useQueryParam('tab');

	const { rootId, filter, view = '' } = useParams<URLParams>();
	const folderId = useQueryParam('folder');
	const fileId = useQueryParam('file');
	const history = useHistory();
	const inSearchView = isSearchView(history.location);

	const setActiveNode = useCallback(
		(newId: string, newTab?: string) => {
			let queryParams = '?';
			if (folderId) {
				queryParams += `folder=${folderId}&`;
			} else if (fileId) {
				queryParams += `file=${fileId}&`;
			}
			queryParams += `node=${newId}`;

			if (newTab) {
				queryParams += `&tab=${newTab}`;
			}

			if (inSearchView) {
				const destination = `${history.location.pathname}${queryParams}`;
				history.replace(destination);
			} else {
				let params = '';
				if (rootId) {
					params += `/${rootId}`;
				} else if (filter) {
					params += `/${filter}/`;
				}
				const destination = `/${view}${params}${queryParams}`;
				navigateTo(destination, true);
			}
		},
		[fileId, filter, folderId, history, inSearchView, navigateTo, rootId, view]
	);

	const removeActiveNode = useCallback(() => {
		if (inSearchView) {
			const destination = `${history.location.pathname}`;
			history.replace(destination);
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
	}, [filter, folderId, history, inSearchView, navigateTo, rootId, view]);

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
