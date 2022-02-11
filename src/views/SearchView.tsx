/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { FC, useEffect } from 'react';

import forEach from 'lodash/forEach';
import map from 'lodash/map';
import partition from 'lodash/partition';
import size from 'lodash/size';
import { useTranslation } from 'react-i18next';

import { searchParamsVar } from '../carbonio-files-ui-common/apollo/searchVar';
import { AdvancedFilters } from '../carbonio-files-ui-common/types/common';
import { PreventDefaultDropContainer } from '../carbonio-files-ui-common/views/components/PreventDefaultDropContainer';
import { ProvidersWrapper } from '../carbonio-files-ui-common/views/components/ProvidersWrapper';
import { SearchView as CommonSearchView } from '../carbonio-files-ui-common/views/SearchView';
import { UpdateQueryContext } from '../constants';

interface SearchViewProps {
	useQuery: () => [Array<any>, (arg: any) => void];
	ResultsHeader: FC<{ label: string }>;
}

const SearchView: React.VFC<SearchViewProps> = ({ useQuery, ResultsHeader }) => {
	const [query, updateQuery] = useQuery();
	const [t] = useTranslation();

	useEffect(() => {
		const [advanced, keywords] = partition(query, (item) => item?.isQueryFilter === true);
		const updatedValue: AdvancedFilters = {};
		if (keywords.length > 0) {
			updatedValue.keywords = map(keywords, (k) => ({ ...k, value: k.label, background: 'gray2' }));
		}
		forEach(advanced, (value) => {
			if (value.isQueryFilter === true && value.varKey) {
				updatedValue[value.varKey as keyof AdvancedFilters] = value;
			}
		});
		if (size(searchParamsVar()) === 0 && size(updatedValue) === 0) {
			return;
		}
		searchParamsVar(updatedValue);
	}, [query]);

	return (
		<PreventDefaultDropContainer>
			<ProvidersWrapper>
				<UpdateQueryContext.Provider value={updateQuery}>
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
