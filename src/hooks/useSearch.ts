/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback, useContext } from 'react';

import { useReactiveVar } from '@apollo/client';
import type { QueryChip } from '@zextras/carbonio-shell-ui';
import { forEach, map, partition } from 'lodash';

import { searchParamsVar } from '../carbonio-files-ui-common/apollo/searchVar';
import {
	AdvancedFilters,
	SearchChip,
	SearchParams
} from '../carbonio-files-ui-common/types/common';
import { UpdateQueryContext } from '../constants';
import { AdvancedSearchChip } from '../types';

interface UseSearchReturnType {
	searchParams: AdvancedFilters;
	search: (keywords: string[]) => void;
	searchAdvancedFilters: (advancedFilters: AdvancedFilters) => void;
}

export function fromAdvancedFiltersToQueryChips(
	advancedFiltersPar: AdvancedFilters
): Array<QueryChip> {
	const reducedForQuery: Array<QueryChip> = [];
	forEach(advancedFiltersPar, (value, key) => {
		const $key = key as keyof AdvancedFilters;
		if ($key === 'keywords') {
			reducedForQuery.push(...map(value, (innerValue) => innerValue));
		} else if ($key === 'flagged') {
			reducedForQuery.push({
				...value,
				queryChipsToAdvancedFiltersValue: {
					flagged: advancedFiltersPar.flagged
				}
			} as AdvancedSearchChip);
		} else if ($key === 'sharedByMe') {
			reducedForQuery.push({
				...value,
				queryChipsToAdvancedFiltersValue: {
					sharedByMe: advancedFiltersPar.sharedByMe
				}
			} as AdvancedSearchChip);
		} else if ($key === 'ownerId') {
			reducedForQuery.push({
				...value,
				queryChipsToAdvancedFiltersValue: {
					ownerId: advancedFiltersPar.ownerId
				}
			} as AdvancedSearchChip);
		} else if ($key === 'type') {
			reducedForQuery.push({
				...value,
				queryChipsToAdvancedFiltersValue: {
					type: advancedFiltersPar.type
				}
			} as AdvancedSearchChip);
		} else if ($key === 'folderId') {
			const $value = value as SearchChip & {
				value: SearchParams['folderId'];
			};
			if ($value.value) {
				reducedForQuery.push({
					...value,
					queryChipsToAdvancedFiltersValue: {
						cascade: advancedFiltersPar.cascade,
						folderId: advancedFiltersPar.folderId
					}
				} as AdvancedSearchChip);
			} else {
				reducedForQuery.push({
					...value,
					queryChipsToAdvancedFiltersValue: {
						cascade: advancedFiltersPar.cascade,
						sharedWithMe: advancedFiltersPar.sharedWithMe,
						folderId: advancedFiltersPar.folderId
					}
				} as AdvancedSearchChip);
			}
		}
	});
	return reducedForQuery;
}

export function fromQueryChipsToAdvancedFilters(queryChips: Array<QueryChip>): AdvancedFilters {
	const [advanced, keywords] = partition<QueryChip, AdvancedSearchChip>(
		queryChips,
		(item): item is AdvancedSearchChip =>
			(item as AdvancedSearchChip).queryChipsToAdvancedFiltersValue !== undefined
	);
	let updatedValue: AdvancedFilters = {};
	if (keywords.length > 0) {
		updatedValue.keywords = map(keywords, (k) => ({ ...k, value: k.label }));
	}
	forEach(advanced, (value) => {
		if (value.queryChipsToAdvancedFiltersValue) {
			updatedValue = { ...updatedValue, ...value.queryChipsToAdvancedFiltersValue };
		}
	});
	return updatedValue;
}

export function useSearch(): UseSearchReturnType {
	const advancedFilters = useReactiveVar<AdvancedFilters>(searchParamsVar);

	const updateQuery = useContext(UpdateQueryContext);

	const search = useCallback(
		(keywords: string[]) => {
			const reducedForQuery = map(
				keywords,
				(keyword, index) =>
					({
						id: `${index}-${keyword}`,
						label: keyword,
						hasAvatar: false,
						background: 'gray2',
						value: keyword
					} satisfies QueryChip)
			);
			updateQuery(reducedForQuery);
		},
		[updateQuery]
	);

	const searchAdvancedFilters = useCallback(
		(advancedFiltersPar: AdvancedFilters) => {
			const reducedForQuery: Array<QueryChip> = fromAdvancedFiltersToQueryChips(advancedFiltersPar);
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
