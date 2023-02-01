/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useMemo } from 'react';

import { getCurrentRoute } from '@zextras/carbonio-shell-ui';
import { head, split } from 'lodash';

import { FILES_ROUTE } from '../carbonio-files-ui-common/constants';
import { NodeType } from '../carbonio-files-ui-common/types/graphql/types';

export type UseInternalLinkHook = (
	id: string,
	type: NodeType
) => {
	internalLink: string | null;
};

export function buildInternalLink(id: string, type: NodeType): string | null {
	const appRoute = getCurrentRoute()?.route;
	const path = head(split(window.location.pathname, appRoute));

	if (type === NodeType.Root) {
		return null;
	}
	if (type === NodeType.Folder) {
		return `${window.location.origin}${path}${FILES_ROUTE}/?folder=${id}`;
	}
	return `${window.location.origin}${path}${FILES_ROUTE}/?file=${id}`;
}

export const useInternalLink: UseInternalLinkHook = (id: string, type: NodeType) => {
	const internalLink = useMemo(() => buildInternalLink(id, type), [id, type]);

	return {
		internalLink
	};
};
