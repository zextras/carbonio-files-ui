/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback } from 'react';

import { includes } from 'lodash';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { DISPLAYER_TABS } from '../carbonio-files-ui-common/constants';
import useQueryParam from '../carbonio-files-ui-common/hooks/useQueryParam';

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
	const [searchParams, setSearchParams] = useSearchParams();

	const navigate = useNavigate();
	const activeNodeId = useQueryParam('node');
	const tab = useQueryParam('tab');

	const folderId = useQueryParam('folder');
	const fileId = useQueryParam('file');

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
		searchParams.delete('node');
		setSearchParams(searchParams, { replace: true });
	}, [searchParams, setSearchParams]);

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
