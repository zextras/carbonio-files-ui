/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useContext, useEffect, useMemo } from 'react';

import { useReactiveVar } from '@apollo/client';
import { sample, isEmpty, filter, reduce, isArray } from 'lodash';
import { useTranslation } from 'react-i18next';

import { useSearch } from '../../../hooks/useSearch';
import { nodeSortVar } from '../../apollo/nodeSortVar';
import { ListContext } from '../../contexts';
import { useFindNodesQuery } from '../../hooks/graphql/queries/useFindNodesQuery';
import { NodeListItemType } from '../../types/common';
import { NonNullableList, OneOrMany } from '../../types/utils';
import { List } from './List';

export const SearchList: React.VFC = () => {
	const [t] = useTranslation();
	const { searchParams } = useSearch();
	const { queryCalled, setQueryCalled } = useContext(ListContext);
	const nodeSort = useReactiveVar(nodeSortVar);
	const {
		data: searchResult,
		loadMore,
		loading,
		hasMore,
		previousData
	} = useFindNodesQuery({
		keywords: reduce(
			searchParams.keywords,
			(keyStrList, keyword) => {
				if (keyword?.value && typeof keyword?.value === 'string') {
					keyStrList.push(keyword.value);
				}
				return keyStrList;
			},
			[] as string[]
		),
		flagged: searchParams.flagged?.value,
		sharedByMe: searchParams.sharedByMe?.value,
		folderId: searchParams.folderId?.value,
		cascade: searchParams.cascade?.value,
		sharedWithMe: searchParams.sharedWithMe?.value,
		sort: nodeSort,
		ownerId: searchParams.ownerId?.value,
		type: searchParams.type?.value
	});

	useEffect(() => {
		const filterCount = filter(
			searchParams,
			(param) =>
				(isArray(param) && !isEmpty(param)) ||
				(!isArray(param) && !!param && 'label' in param && !!param.label)
		).length;
		setQueryCalled && setQueryCalled(filterCount > 0 && (!!previousData || !!searchResult));
	}, [previousData, searchParams, searchResult, setQueryCalled]);

	const nodes = useMemo<NodeListItemType[]>(() => {
		if (searchResult?.findNodes && searchResult.findNodes.nodes.length > 0) {
			const $nodes = searchResult.findNodes.nodes;
			return filter($nodes, (node) => !!node) as NonNullableList<typeof $nodes>;
		}
		return [];
	}, [searchResult]);

	const emptyListMessage = useMemo(() => {
		const translations: OneOrMany<string> = queryCalled
			? t('empty.search.noResults', {
					returnObjects: true,
					defaultValue: t('empty.search.hint', "Your search didn't match any files or folders")
			  })
			: t('empty.search.notRun', {
					returnObjects: true,
					defaultValue: 'No search executed'
			  });
		if (translations instanceof Array) {
			return sample(translations) as string;
		}
		return translations;
	}, [queryCalled, t]);

	return (
		<List
			nodes={nodes}
			loading={loading}
			hasMore={hasMore}
			loadMore={loadMore}
			mainList={false}
			emptyListMessage={emptyListMessage}
		/>
	);
};
