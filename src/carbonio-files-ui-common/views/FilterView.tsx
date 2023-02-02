/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useReactiveVar } from '@apollo/client';
import { Container, Responsive, Snackbar } from '@zextras/carbonio-design-system';
import { filter, noop } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';

import { ACTION_IDS, ACTION_TYPES } from '../../constants';
import { useCreateOptions } from '../../hooks/useCreateOptions';
import { useNavigation } from '../../hooks/useNavigation';
import { nodeSortVar } from '../apollo/nodeSortVar';
import {
	DISPLAYER_WIDTH,
	FILES_APP_ID,
	FILTER_PARAMS,
	FILTER_TYPE,
	LIST_WIDTH,
	ROOTS
} from '../constants';
import { ListContext, ListHeaderActionContext } from '../contexts';
import { useFindNodesQuery } from '../hooks/graphql/queries/useFindNodesQuery';
import { useUpload } from '../hooks/useUpload';
import { Crumb, DocsType, NodeListItemType, URLParams } from '../types/common';
import { NodeSort } from '../types/graphql/types';
import { NonNullableListItem, Unwrap } from '../types/utils';
import { getUploadAddTypeFromInput } from '../utils/uploadUtils';
import { getNewDocumentActionLabel, inputElement } from '../utils/utils';
import { Displayer } from './components/Displayer';
import { List } from './components/List';
import { SortingComponent } from './components/SortingComponent';

const FilterView: React.VFC = () => {
	const { filter: filterParam } = useParams<URLParams>();
	const isFlaggedFilter = `/${filterParam}` === FILTER_TYPE.flagged;
	const isMyTrashFilter = `/${filterParam}` === FILTER_TYPE.myTrash;
	const isSharedTrashFilter = `/${filterParam}` === FILTER_TYPE.sharedTrash;
	const isSharedByMeFilter = `/${filterParam}` === FILTER_TYPE.sharedByMe;
	const isSharedWithMeFilter = `/${filterParam}` === FILTER_TYPE.sharedWithMe;
	const isRecentsFilter = `/${filterParam}` === FILTER_TYPE.recents;

	const { setCreateOptions, removeCreateOptions } = useCreateOptions();
	const [t] = useTranslation();

	const { pathname, search } = useLocation();

	const { add } = useUpload();
	const { navigateToFolder } = useNavigation();
	const [showUploadSnackbar, setShowUploadSnackbar] = useState(false);
	const [isEmpty, setIsEmpty] = useState(false);

	const closeUploadSnackbar = useCallback(() => {
		setShowUploadSnackbar(false);
	}, []);

	const uploadSnackbarAction = useCallback(() => {
		navigateToFolder(ROOTS.LOCAL_ROOT);
	}, [navigateToFolder]);

	const inputElementOnchange = useCallback(
		(ev: Event) => {
			if (ev.currentTarget instanceof HTMLInputElement) {
				if (ev.currentTarget.files) {
					add(getUploadAddTypeFromInput(ev.currentTarget.files), ROOTS.LOCAL_ROOT);
					setShowUploadSnackbar(true);
				}
				// required to select 2 times the same file/files
				ev.currentTarget.value = '';
			}
		},
		[add]
	);

	useEffect(() => {
		setCreateOptions(
			{
				id: ACTION_IDS.UPLOAD_FILE,
				type: ACTION_TYPES.NEW,
				action: () => ({
					id: ACTION_IDS.UPLOAD_FILE,
					primary: true,
					group: FILES_APP_ID,
					// FIXME: remove ts-ignore when shell will fix type of "type"
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					type: ACTION_TYPES.NEW,
					label: t('create.options.new.upload', 'Upload'),
					icon: 'CloudUploadOutline',
					click: (event): void => {
						event && event.stopPropagation();
						inputElement.click();
						inputElement.onchange = inputElementOnchange;
					}
				})
			},
			{
				id: ACTION_IDS.CREATE_FOLDER,
				type: ACTION_TYPES.NEW,
				action: () => ({
					id: ACTION_IDS.CREATE_FOLDER,
					group: FILES_APP_ID,
					type: ACTION_TYPES.NEW,
					label: t('create.options.new.folder', 'New Folder'),
					icon: 'FolderOutline',
					disabled: true,
					click: noop
				})
			},
			{
				id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
				type: ACTION_TYPES.NEW,
				action: () => ({
					id: ACTION_IDS.CREATE_DOCS_DOCUMENT,
					group: FILES_APP_ID,
					type: ACTION_TYPES.NEW,
					label: t('create.options.new.document', 'New Document'),
					icon: 'FileTextOutline',
					disabled: true,
					click: noop,
					items: [
						{
							id: `${ACTION_IDS.CREATE_DOCS_DOCUMENT}-libre`,
							label: getNewDocumentActionLabel(t, DocsType.LIBRE_DOCUMENT),
							click: noop,
							disabled: true
						},
						{
							id: `${ACTION_IDS.CREATE_DOCS_DOCUMENT}-ms`,
							label: getNewDocumentActionLabel(t, DocsType.MS_DOCUMENT),
							click: noop,
							disabled: true
						}
					]
				})
			},
			{
				id: ACTION_IDS.CREATE_DOCS_SPREADSHEET,
				type: ACTION_TYPES.NEW,
				action: () => ({
					id: ACTION_IDS.CREATE_DOCS_SPREADSHEET,
					group: FILES_APP_ID,
					type: ACTION_TYPES.NEW,
					label: t('create.options.new.spreadsheet', 'New Spreadsheet'),
					icon: 'FileCalcOutline',
					disabled: true,
					click: noop,
					items: [
						{
							id: `${ACTION_IDS.CREATE_DOCS_SPREADSHEET}-libre`,
							label: getNewDocumentActionLabel(t, DocsType.LIBRE_SPREADSHEET),
							click: noop,
							disabled: true
						},
						{
							id: `${ACTION_IDS.CREATE_DOCS_SPREADSHEET}-ms`,
							label: getNewDocumentActionLabel(t, DocsType.MS_SPREADSHEET),
							click: noop,
							disabled: true
						}
					]
				})
			},
			{
				id: ACTION_IDS.CREATE_DOCS_PRESENTATION,
				type: ACTION_TYPES.NEW,
				action: () => ({
					id: ACTION_IDS.CREATE_DOCS_PRESENTATION,
					group: FILES_APP_ID,
					type: ACTION_TYPES.NEW,
					label: t('create.options.new.presentation', 'New Presentation'),
					icon: 'FilePresentationOutline',
					disabled: true,
					click: noop,
					items: [
						{
							id: `${ACTION_IDS.CREATE_DOCS_PRESENTATION}-libre`,
							label: getNewDocumentActionLabel(t, DocsType.LIBRE_PRESENTATION),
							click: noop,
							disabled: true
						},
						{
							id: `${ACTION_IDS.CREATE_DOCS_PRESENTATION}-ms`,
							label: getNewDocumentActionLabel(t, DocsType.MS_PRESENTATION),
							click: noop,
							disabled: true
						}
					]
				})
			}
		);
		return (): void => {
			removeCreateOptions(
				ACTION_IDS.CREATE_FOLDER,
				ACTION_IDS.CREATE_DOCS_DOCUMENT,
				ACTION_IDS.CREATE_DOCS_SPREADSHEET,
				ACTION_IDS.CREATE_DOCS_PRESENTATION
			);
		};
	}, [
		filterParam,
		inputElementOnchange,
		pathname,
		removeCreateOptions,
		search,
		setCreateOptions,
		t
	]);

	const displayerPlaceholdersKey = useMemo(() => {
		const filterKey = filterParam && filterParam.includes('Trash') ? 'trash' : filterParam;
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
					label: t('secondaryBar.filtersList.sharedElements', 'Shared elements')
				});
			} else if (isMyTrashFilter) {
				_crumbs.push({
					id: 'trashSharedByMe',
					label: t('secondaryBar.filtersList.myElements', 'My Elements')
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
		() => !isRecentsFilter && <SortingComponent />,
		[isRecentsFilter]
	);

	const {
		data: findNodesResult,
		loading,
		hasMore,
		loadMore
	} = useFindNodesQuery({
		...FILTER_PARAMS[filterParam],
		sort
	});

	const nodes = useMemo<NodeListItemType[]>(() => {
		if (findNodesResult?.findNodes?.nodes && findNodesResult.findNodes.nodes.length > 0) {
			const $nodes = findNodesResult.findNodes.nodes;
			return filter<Unwrap<typeof $nodes>, NonNullableListItem<typeof $nodes>>(
				$nodes,
				(node): node is NonNullableListItem<typeof $nodes> => !!node
			);
		}
		return [];
	}, [findNodesResult]);

	const ListComponent = useMemo(
		() =>
			filterParam ? (
				<ListHeaderActionContext.Provider value={ActionComponent}>
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
		<ListContext.Provider value={{ isEmpty, setIsEmpty }}>
			<Container
				orientation="row"
				crossAlignment="flex-start"
				mainAlignment="flex-start"
				width="fill"
				height="fill"
				background="gray5"
				borderRadius="none"
				maxHeight="100%"
			>
				<Responsive mode="desktop">
					<Container
						width={LIST_WIDTH}
						mainAlignment="flex-start"
						crossAlignment="unset"
						borderRadius="none"
						background="gray6"
					>
						{ListComponent}
					</Container>
					<Container
						width={DISPLAYER_WIDTH}
						mainAlignment="flex-start"
						crossAlignment="flex-start"
						borderRadius="none"
						style={{ maxHeight: '100%' }}
					>
						<Displayer translationKey={displayerPlaceholdersKey} />
					</Container>
				</Responsive>
				<Responsive mode="mobile">{ListComponent}</Responsive>
			</Container>
			<Snackbar
				open={showUploadSnackbar}
				onClose={closeUploadSnackbar}
				type="info"
				label={t('uploads.destination.home', "Upload occurred in Files' Home")}
				actionLabel={t('snackbar.upload.goToFolder', 'Go to folder')}
				onActionClick={uploadSnackbarAction}
			/>
		</ListContext.Provider>
	);
};

export default FilterView;
