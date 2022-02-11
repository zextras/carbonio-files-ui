/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback, useContext } from 'react';

import { useReactiveVar } from '@apollo/client';
// eslint-disable-next-line import/no-unresolved
import { QueryChip as ShellQueryChip } from '@zextras/carbonio-shell-ui';
import forEach from 'lodash/forEach';
import includes from 'lodash/includes';
import map from 'lodash/map';

import { searchParamsVar } from '../carbonio-files-ui-common/apollo/searchVar';
import { AdvancedFilters } from '../carbonio-files-ui-common/types/common';
import { UpdateQueryContext } from '../constants';

export type QueryChip = Omit<ShellQueryChip, 'label' | 'value'> & {
	label?: string;
	value?: unknown;
	varKey?: keyof AdvancedFilters;
};

interface UseSearchReturnType {
	searchParams: AdvancedFilters;
	search: (keywords: string[]) => void;
	searchAdvancedFilters: (advancedFilters: AdvancedFilters) => void;
}

export function useSearch(): UseSearchReturnType {
	const advancedFilters = useReactiveVar<AdvancedFilters>(searchParamsVar);

	const updateQuery = useContext(UpdateQueryContext);

	const search = useCallback(
		(keywords: string[]) => {
			const reducedForQuery = map(keywords, (keyword) => ({
				label: keyword,
				hasAvatar: false,
				background: 'gray2',
				value: keyword
			}));
			updateQuery(reducedForQuery);
		},
		[updateQuery]
	);

	const searchAdvancedFilters = useCallback(
		(advancedFiltersPar: AdvancedFilters) => {
			const reducedForQuery: Array<QueryChip> = [];
			forEach(advancedFiltersPar, (value, key, _obj) => {
				if (key === 'keywords') {
					reducedForQuery.push(...map(value, (innerValue) => innerValue));
				} else if (includes(['flagged', 'sharedByMe', 'folderId'], key)) {
					reducedForQuery.push({
						...value,
						isQueryFilter: true,
						varKey: key as keyof AdvancedFilters
					});
				}
			});
			updateQuery(reducedForQuery);
		},
		[updateQuery]
	);

	return {
		searchParams: advancedFilters,
		search,
		searchAdvancedFilters
	};
}
