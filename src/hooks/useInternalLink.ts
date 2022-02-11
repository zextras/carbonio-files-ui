/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useMemo } from 'react';

import head from 'lodash/head';
import split from 'lodash/split';
import trim from 'lodash/trim';
import { useLocation } from 'react-router-dom';

import { NodeType } from '../carbonio-files-ui-common/types/graphql/types';

export type UseInternalLinkHook = (
	id: string,
	type: NodeType
) => {
	internalLink: string;
};

export const useInternalLink: UseInternalLinkHook = (id: string, type: NodeType) => {
	const { pathname } = useLocation();
	const appRoute = useMemo(() => head(split(trim(pathname, '/'), '/')), [pathname]);

	const internalLink = useMemo(() => {
		const path = head(split(window.parent.location.pathname, appRoute));

		if (type === NodeType.Folder) {
			return `${window.parent.location.origin}${path}${appRoute}/?folder=${id}`;
		}
		return `${window.parent.location.origin}${path}${appRoute}/?file=${id}`;
	}, [appRoute, id, type]);

	return {
		internalLink
	};
};
