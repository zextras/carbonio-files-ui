/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { useReactiveVar } from '@apollo/client';
import { Container } from '@zextras/carbonio-design-system';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Displayer } from './components/Displayer';
import { List } from './components/List';
import { SelectionProvider } from './components/SelectionProvider';
import { SortingComponent } from './components/SortingComponent';
import { ViewModeComponent } from './components/ViewModeComponent';
import { ViewLayout } from './ViewLayout';
import { nodeSortVar } from '../apollo/nodeSortVar';
import { FILTER_PARAMS, FILTER_TYPE, ROOTS } from '../constants';
import { ListHeaderActionContext } from '../contexts';
import { useFindNodesQuery } from '../hooks/graphql/queries/useFindNodesQuery';
import { useUploadFileNewAction } from '../hooks/useUploadFileNewAction';
import { Crumb, URLParams } from '../types/common';
import { NodeSort } from '../types/graphql/types';
import { NonNullableListItem } from '../types/utils';

const FilterView = (): React.JSX.Element => {
	const { filter: filterParam } = useParams<URLParams>();
	const isFlaggedFilter = `/${filterParam}` === FILTER_TYPE.flagged;
	const isMyTrashFilter = `/${filterParam}` === FILTER_TYPE.myTrash;
	const isSharedTrashFilter = `/${filterParam}` === FILTER_TYPE.sharedTrash;
	const isSharedByMeFilter = `/${filterParam}` === FILTER_TYPE.sharedByMe;
	const isSharedWithMeFilter = `/${filterParam}` === FILTER_TYPE.sharedWithMe;
	const isRecentsFilter = `/${filterParam}` === FILTER_TYPE.recents;

	const [t] = useTranslation();

	useUploadFileNewAction(true, ROOTS.LOCAL_ROOT);

	const displayerPlaceholdersKey = useMemo(() => {
		const filterKey = filterParam?.includes('Trash') ? 'trash' : filterParam;
		return `displayer.filter.${filterKey}`;
	}, [filterParam]);

	const crumbs = useMemo<Crumb[]>(() => {
		const _crumbs = [];
		if (isFlaggedFilter) {
			_crumbs.push({
				id: 'flagged',
				label: t('secondaryBar.filtersList.flagged', 'Flagged')
			});
		} else if (isMyTrashFilter || isSharedTrashFilter) {
			_crumbs.push({
				id: 'trash',
				label: t('secondaryBar.filtersList.trash', 'Trash')
			});
			if (isSharedTrashFilter) {
				_crumbs.push({
					id: 'trashSharedWithMe',
					label: t('secondaryBar.filtersList.sharedElements', 'Shared items')
				});
			} else if (isMyTrashFilter) {
				_crumbs.push({
					id: 'trashSharedByMe',
					label: t('secondaryBar.filtersList.myElements', 'My items')
				});
			}
		} else if (isSharedByMeFilter) {
			_crumbs.push({
				id: 'sharedByMe',
				label: t('secondaryBar.filtersList.sharedByMe', 'Shared by me')
			});
		} else if (isSharedWithMeFilter) {
			_crumbs.push({
				id: 'sharedWithMe',
				label: t('secondaryBar.filtersList.sharedWithMe', 'Shared with me')
			});
		} else if (isRecentsFilter) {
			_crumbs.push({
				id: 'recents',
				label: t('secondaryBar.filtersList.recents', 'Recents')
			});
		}
		return _crumbs;
	}, [
		isFlaggedFilter,
		isMyTrashFilter,
		isSharedTrashFilter,
		isSharedByMeFilter,
		isSharedWithMeFilter,
		isRecentsFilter,
		t
	]);

	const emptyListMessage = useMemo(() => {
		if (isFlaggedFilter) {
			return t('empty.filter.flagged', 'There are no flagged items.');
		}
		if (isMyTrashFilter || isSharedTrashFilter) {
			return t('empty.filter.trash', 'The trash is empty.');
		}
		if (isSharedByMeFilter) {
			return t(
				'empty.filter.sharedByMe',
				"You haven't shared any item with your collaborators yet. "
			);
		}
		if (isSharedWithMeFilter) {
			return t('empty.filter.sharedWithMe', 'There are no items shared with you yet.');
		}
		if (isRecentsFilter) {
			return t('empty.filter.recents', "It looks like there's nothing here.");
		}
		return t('empty.filter.hint', "It looks like there's nothing here.");
	}, [
		isFlaggedFilter,
		isMyTrashFilter,
		isRecentsFilter,
		isSharedByMeFilter,
		isSharedTrashFilter,
		isSharedWithMeFilter,
		t
	]);

	const nodeSort = useReactiveVar(nodeSortVar);
	const sort = useMemo(() => {
		if (isRecentsFilter) {
			return NodeSort.UpdatedAtDesc;
		}
		return nodeSort;
	}, [isRecentsFilter, nodeSort]);

	const canUploadFile = useMemo(
		() => !isMyTrashFilter && !isSharedTrashFilter,
		[isMyTrashFilter, isSharedTrashFilter]
	);

	const ActionComponent = useMemo(
		() => (
			<>
				<ViewModeComponent />
				{!isRecentsFilter && <SortingComponent />}
			</>
		),
		[isRecentsFilter]
	);

	const {
		data: findNodesResult,
		loading,
		hasMore,
		loadMore
	} = useFindNodesQuery({
		...FILTER_PARAMS[filterParam as URLParams['filter']],
		sort
	});

	const nodes = useMemo(() => {
		if (findNodesResult?.findNodes?.nodes && findNodesResult.findNodes.nodes.length > 0) {
			return findNodesResult.findNodes.nodes.filter(
				(node): node is NonNullableListItem<typeof findNodesResult.findNodes.nodes> => !!node
			);
		}
		return [];
	}, [findNodesResult]);

	const ListComponent = useMemo(
		() =>
			filterParam ? (
				<ListHeaderActionContext.Provider value={ActionComponent}>
					<SelectionProvider items={nodes}>
						<List
							nodes={nodes}
							loading={loading}
							hasMore={hasMore}
							loadMore={loadMore}
							crumbs={crumbs}
							canUpload={canUploadFile}
							mainList={false}
							emptyListMessage={emptyListMessage}
						/>
					</SelectionProvider>
				</ListHeaderActionContext.Provider>
			) : (
				<Container data-testid="missing-filter">{emptyListMessage}</Container>
			),
		[
			ActionComponent,
			canUploadFile,
			crumbs,
			emptyListMessage,
			filterParam,
			hasMore,
			loadMore,
			loading,
			nodes
		]
	);

	return (
		<ViewLayout
			listComponent={ListComponent}
			displayerComponent={<Displayer translationKey={displayerPlaceholdersKey} />}
		/>
	);
};

export default FilterView;
