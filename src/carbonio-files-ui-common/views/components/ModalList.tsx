/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useLayoutEffect, useMemo, useRef } from 'react';

import { useQuery } from '@apollo/client';
import { Container, Row } from '@zextras/carbonio-design-system';
import { takeRightWhile } from 'lodash';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { BREADCRUMB_ROW_HEIGHT, LIST_ITEM_HEIGHT_COMPACT, ROOTS } from '../../constants';
import GET_PATH from '../../graphql/queries/getPath.graphql';
import { Crumb, NodeListItemType } from '../../types/common';
import { GetPathQuery, GetPathQueryVariables, Node } from '../../types/graphql/types';
import { OneOrMany } from '../../types/utils';
import { canBeWriteNodeDestination } from '../../utils/ActionsFactory';
import { buildCrumbs, cssCalcBuilder } from '../../utils/utils';
import { InteractiveBreadcrumbs } from '../InteractiveBreadcrumbs';
import { EmptyFolder } from './EmptyFolder';
import { ListContent } from './ListContent';
import { LoadingIcon } from './LoadingIcon';
import { ScrollContainer } from './ScrollContainer';
import { OverFlowHiddenRow } from './StyledComponents';

interface ModalListProps {
	folderId: string;
	nodes: Array<NodeListItemType>;
	activeNodes?: OneOrMany<string>;
	setActiveNode: (node: NodeListItemType, event: React.SyntheticEvent) => void;
	loadMore: () => void;
	hasMore: boolean;
	navigateTo: (id: string, event?: React.SyntheticEvent | Event) => void;
	loading: boolean;
	writingFile?: boolean;
	writingFolder?: boolean;
	limitNavigation?: boolean;
	allowRootNavigation?: boolean;
}

const ModalContainer = styled(Container)`
	flex: 1 1 auto;
`;

export const ModalList: React.VFC<ModalListProps> = ({
	folderId,
	nodes,
	activeNodes,
	setActiveNode,
	loadMore,
	hasMore,
	navigateTo,
	loading,
	writingFile = false,
	writingFolder = false,
	limitNavigation = false,
	allowRootNavigation = false
}) => {
	const [t] = useTranslation();
	const listRef = useRef<HTMLDivElement | null>(null);

	useLayoutEffect(() => {
		// scroll list container to top when folderId changes
		listRef.current && listRef.current.scrollTo(0, 0);
	}, [folderId]);

	// use a useQuery to load full path only when required so that operations like move that cleanup cache trigger a refetch
	const { data: pathData, loading: loadingPath } = useQuery<GetPathQuery, GetPathQueryVariables>(
		GET_PATH,
		{
			variables: {
				node_id: folderId
			},
			skip: !folderId,
			onError(err) {
				console.error(err);
			}
		}
	);

	// for shared with me nodes, build the breadcrumb from the leave to the highest ancestor that has right permissions.
	// to be valid an ancestor must have can_write_file if moving files, can_write_folder if moving folders,
	// can_write_file and can_write_folder if moving both files and folders
	const crumbs = useMemo<Crumb[]>(() => {
		const $crumbs: Crumb[] = [];
		if (allowRootNavigation) {
			$crumbs.push({
				id: ROOTS.ENTRY_POINT,
				label: t('modal.roots.rootsList', 'Files'),
				click: (event: React.SyntheticEvent | KeyboardEvent) => {
					navigateTo('', event);
				}
			});
		}
		const validParents = limitNavigation
			? takeRightWhile(
					pathData?.getPath,
					(parent: Pick<Node, 'id' | 'name' | 'permissions' | 'type'> | undefined | null) =>
						// TODO: it might be convenient to move this check in parent component through the checkDisabled function
						parent && canBeWriteNodeDestination(parent, writingFile, writingFolder)
			  )
			: pathData?.getPath;
		if (validParents) {
			$crumbs.push(...buildCrumbs(validParents, navigateTo, t));
		}
		// remove click action from last crumb
		if ($crumbs.length > 0) {
			delete $crumbs[$crumbs.length - 1].click;
		}
		return $crumbs;
	}, [
		allowRootNavigation,
		limitNavigation,
		pathData?.getPath,
		navigateTo,
		t,
		writingFile,
		writingFolder
	]);

	return (
		<ModalContainer
			mainAlignment="flex-start"
			crossAlignment="flex-start"
			data-testid={`modal-list-${folderId}`}
			maxHeight="100%"
			minHeight={cssCalcBuilder(BREADCRUMB_ROW_HEIGHT, ['+', LIST_ITEM_HEIGHT_COMPACT])}
		>
			<OverFlowHiddenRow
				width="fill"
				wrap="nowrap"
				height={BREADCRUMB_ROW_HEIGHT}
				mainAlignment="flex-start"
				flexShrink={0}
				data-testid="modal-listHeader"
			>
				{crumbs && <InteractiveBreadcrumbs crumbs={crumbs} />}
				{(loading || loadingPath) && (
					<Row mainAlignment="flex-end" wrap="nowrap" flexGrow={1}>
						<LoadingIcon icon="Refresh" iconColor="primary" type="ghost" />
					</Row>
				)}
			</OverFlowHiddenRow>
			<Container mainAlignment="flex-start" minHeight="0">
				{nodes.length > 0 ? (
					<ListContent
						nodes={nodes}
						activeNodes={activeNodes}
						setActiveNode={setActiveNode}
						compact
						navigateTo={navigateTo}
						loading={loading}
						hasMore={hasMore}
						loadMore={loadMore}
						ref={listRef}
					/>
				) : (
					!loading && (
						<ScrollContainer>
							<EmptyFolder
								message={t('empty.folder.hint', "It looks like there's nothing here.")}
							/>
						</ScrollContainer>
					)
				)}
			</Container>
		</ModalContainer>
	);
};
