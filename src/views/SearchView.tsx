/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect } from 'react';

import type { QueryChip, SearchViewProps } from '@zextras/carbonio-shell-ui';
import { intersectionBy } from 'lodash';
import forEach from 'lodash/forEach';
import map from 'lodash/map';
import partition from 'lodash/partition';
import some from 'lodash/some';
import { useTranslation } from 'react-i18next';

import { searchParamsVar } from '../carbonio-files-ui-common/apollo/searchVar';
import { AdvancedFilters } from '../carbonio-files-ui-common/types/common';
import { PreventDefaultDropContainer } from '../carbonio-files-ui-common/views/components/PreventDefaultDropContainer';
import { ProvidersWrapper } from '../carbonio-files-ui-common/views/components/ProvidersWrapper';
import { SearchView as CommonSearchView } from '../carbonio-files-ui-common/views/SearchView';
import { UpdateQueryContext } from '../constants';
import { AdvancedSearchChip } from '../types';

const SearchView: React.VFC<SearchViewProps> = ({ useQuery, ResultsHeader }) => {
	const [query, updateQuery] = useQuery();
	const [t] = useTranslation();

	const updateQueryWrapper = useCallback<(args: QueryChip[]) => void>(
		(args) => {
			updateQuery(args);
		},
		[updateQuery]
	);

	useEffect(() => {
		const [advanced, keywords] = partition<QueryChip, AdvancedSearchChip>(
			query,
			(item): item is AdvancedSearchChip => item.isQueryFilter === true
		);
		const updatedValue: AdvancedFilters = {};
		if (keywords.length > 0) {
			updatedValue.keywords = map(keywords, (k) => ({ ...k, value: k.label, background: 'gray2' }));
		}
		forEach(advanced, (value) => {
			updatedValue[value.varKey] = value;
		});
		// check if values in query are different from values in searchParamsVar. If so, update searchParamsVar in order
		// to keep the searches synced.
		if (
			intersectionBy(keywords, searchParamsVar().keywords || [], 'value').length !==
				keywords.length ||
			some(advanced, (value) => searchParamsVar()[value.varKey]?.value !== value.value)
		) {
			// FIXME: since we cannot set hidden chips in query, we need to manually set the hidden params in
			//  the new ones received by the shell
			const newParamsVar = {
				...updatedValue,
				cascade: searchParamsVar().cascade,
				sharedWithMe: searchParamsVar().sharedWithMe
			};
			searchParamsVar(newParamsVar);
		}
	}, [query]);

	return (
		<PreventDefaultDropContainer>
			<ProvidersWrapper>
				<UpdateQueryContext.Provider value={updateQueryWrapper}>
					<CommonSearchView
						resultsHeader={<ResultsHeader label={t('search.resultsFor', 'Results for:')} />}
						listWidth="25%"
						displayerWidth="75%"
					/>
				</UpdateQueryContext.Provider>
			</ProvidersWrapper>
		</PreventDefaultDropContainer>
	);
};

export default SearchView;
