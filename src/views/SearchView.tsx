/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useEffect } from 'react';

import type { QueryChip, SearchViewProps } from '@zextras/carbonio-shell-ui';
import { size } from 'lodash';
import { useTranslation } from 'react-i18next';

import { searchParamsVar } from '../carbonio-files-ui-common/apollo/searchVar';
import { AdvancedFilters } from '../carbonio-files-ui-common/types/common';
import { PreventDefaultDropContainer } from '../carbonio-files-ui-common/views/components/PreventDefaultDropContainer';
import {
	GlobalProvidersWrapper,
	ViewProvidersWrapper
} from '../carbonio-files-ui-common/views/components/ProvidersWrapper';
import { SearchView as CommonSearchView } from '../carbonio-files-ui-common/views/SearchView';
import { UpdateQueryContext } from '../constants';
import { fromQueryChipsToAdvancedFilters } from '../hooks/useSearch';

const SearchView = ({ useQuery, ResultsHeader }: SearchViewProps): React.JSX.Element => {
	const [query, updateQuery] = useQuery();
	const [t] = useTranslation();

	useEffect(() => {
		const updatedValue: AdvancedFilters = fromQueryChipsToAdvancedFilters(query);

		if (size(updatedValue) === 0 && size(searchParamsVar()) > 0) {
			searchParamsVar({});
		} else {
			searchParamsVar(updatedValue);
		}
	}, [query]);

	return (
		<PreventDefaultDropContainer>
			<GlobalProvidersWrapper>
				<ViewProvidersWrapper>
					<UpdateQueryContext.Provider value={updateQuery as (args: QueryChip[]) => void}>
						<CommonSearchView
							resultsHeader={<ResultsHeader label={t('search.resultsFor', 'Results for:')} />}
							listWidth="25%"
							displayerWidth="75%"
						/>
					</UpdateQueryContext.Provider>
				</ViewProvidersWrapper>
			</GlobalProvidersWrapper>
		</PreventDefaultDropContainer>
	);
};

export default SearchView;
