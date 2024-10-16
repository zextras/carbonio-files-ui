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

import { CompactListContent, CompactListContentProps } from './CompactListContent';
import { EmptyFolder } from './EmptyFolder';
import { LoadingIcon } from './LoadingIcon';
import { ScrollContainer } from './ScrollContainer';
import { OverFlowHiddenRow } from './StyledComponents';
import { BREADCRUMB_ROW_HEIGHT, LIST_ITEM_HEIGHT_COMPACT, ROOTS } from '../../constants';
import { Crumb, Node } from '../../types/common';
import { GetPathDocument, GetPathQuery, GetPathQueryVariables } from '../../types/graphql/types';
import { canBeWriteNodeDestination } from '../../utils/ActionsFactory';
import { buildCrumbs, cssCalcBuilder } from '../../utils/utils';
import { InteractiveBreadcrumbs } from '../InteractiveBreadcrumbs';

type NodeItem = CompactListContentProps['nodes'][number];

export interface ModalListProps<TNode extends NodeItem = NodeItem> {
	folderId: string;
	nodes: CompactListContentProps<TNode>['nodes'];
	activeNodes: CompactListContentProps<TNode>['activeNodes'];
	setActiveNode: CompactListContentProps<TNode>['setActiveNode'];
	loadMore: () => void;
	hasMore: boolean;
	navigateTo: NonNullable<CompactListContentProps<TNode>['navigateTo']>;
	loading: boolean;
	writingFile?: boolean;
	writingFolder?: boolean;
	limitNavigation?: boolean;
	allowRootNavigation?: boolean;
}

const ModalContainer = styled(Container)`
	flex: 1 1 auto;
`;

export const ModalList = <TNode extends NodeItem = NodeItem>({
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
}: ModalListProps<TNode>): React.JSX.Element => {
	const [t] = useTranslation();
	const listRef = useRef<HTMLDivElement | null>(null);

	useLayoutEffect(() => {
		// scroll list container to top when folderId changes
		listRef.current && listRef.current.scrollTo(0, 0);
	}, [folderId]);

	// use a useQuery to load full path only when required so that operations like move that cleanup cache trigger a refetch
	const { data: pathData, loading: loadingPath } = useQuery<GetPathQuery, GetPathQueryVariables>(
		GetPathDocument,
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
				onClick: (event: React.SyntheticEvent | KeyboardEvent) => {
					navigateTo('', event);
				}
			});
		}
		const validParents = limitNavigation
			? takeRightWhile(
					pathData?.getPath,
					(parent: Node<'id' | 'name' | 'permissions' | 'type'> | undefined | null) =>
						// TODO: it might be convenient to move this check in parent component through the checkDisabled function
						parent && canBeWriteNodeDestination(parent, writingFile, writingFolder)
				)
			: pathData?.getPath;
		if (validParents) {
			$crumbs.push(...buildCrumbs(validParents, navigateTo, t));
		}
		// remove click action from last crumb
		if ($crumbs.length > 0) {
			delete $crumbs[$crumbs.length - 1].onClick;
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
			data-testid={'modal-list'}
			maxHeight="100%"
			minHeight={cssCalcBuilder(BREADCRUMB_ROW_HEIGHT, ['+', LIST_ITEM_HEIGHT_COMPACT])}
		>
			<OverFlowHiddenRow
				width="fill"
				wrap="nowrap"
				height={BREADCRUMB_ROW_HEIGHT}
				mainAlignment="flex-start"
				flexShrink={0}
				data-testid="modal-list-header"
			>
				{crumbs && <InteractiveBreadcrumbs crumbs={crumbs} />}
				{(loading || loadingPath) && (
					<Row mainAlignment="flex-end" wrap="nowrap" flexGrow={1}>
						<LoadingIcon icon="Refresh" color="primary" />
					</Row>
				)}
			</OverFlowHiddenRow>
			<Container mainAlignment="flex-start" minHeight="0">
				{nodes.length > 0 ? (
					<CompactListContent
						nodes={nodes}
						activeNodes={activeNodes}
						setActiveNode={setActiveNode}
						navigateTo={navigateTo}
						hasMore={hasMore}
						loadMore={loadMore}
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
