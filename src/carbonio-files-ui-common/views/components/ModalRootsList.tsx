/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Container, Row } from '@zextras/carbonio-design-system';
import { forEach, isEmpty, reduce } from 'lodash';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import {
	BREADCRUMB_ROW_HEIGHT,
	FILTER_PARAMS,
	LIST_ITEM_HEIGHT_COMPACT,
	NODES_SORT_DEFAULT,
	ROOTS
} from '../../constants';
import { useFindNodesQuery } from '../../hooks/graphql/queries/useFindNodesQuery';
import { Crumb, NodeListItemType, RootListItemType } from '../../types/common';
import { MakeOptional, NodeType } from '../../types/graphql/types';
import { OneOrMany } from '../../types/utils';
import { cssCalcBuilder } from '../../utils/utils';
import { InteractiveBreadcrumbs } from '../InteractiveBreadcrumbs';
import { EmptyFolder } from './EmptyFolder';
import { ListContent } from './ListContent';
import { LoadingIcon } from './LoadingIcon';
import { ScrollContainer } from './ScrollContainer';
import { OverFlowHiddenRow } from './StyledComponents';

interface RootsListProps {
	activeNodes?: OneOrMany<string>;
	setActiveNode: (
		node: NodeListItemType | RootListItemType,
		event: React.SyntheticEvent | Event
	) => void;
	navigateTo: (id: string, event?: React.SyntheticEvent | Event) => void;
	showTrash?: boolean;
	checkDisabled: (node: NodeListItemType | RootListItemType) => boolean;
	checkSelectable: (node: NodeListItemType | RootListItemType) => boolean;
}

const ModalContainer = styled(Container)`
	flex: 1 1 auto;
`;

type FilterQueryParams = Pick<
	Parameters<typeof useFindNodesQuery>[0],
	'flagged' | 'sharedWithMe' | 'folderId' | 'cascade' | 'directShare'
>;

export const ModalRootsList: React.VFC<RootsListProps> = ({
	activeNodes,
	setActiveNode,
	navigateTo,
	showTrash = false,
	checkDisabled,
	checkSelectable
}) => {
	const [t] = useTranslation();
	const [filterQueryParams, setFilterQueryParam] = useState<FilterQueryParams>({});
	const {
		data: findNodesData,
		loading,
		loadMore,
		hasMore
	} = useFindNodesQuery({ ...filterQueryParams, sort: NODES_SORT_DEFAULT });

	const listRef = useRef<HTMLDivElement | null>(null);

	useLayoutEffect(() => {
		// scroll list container to top when folderId changes
		listRef.current && listRef.current.scrollTo(0, 0);
	}, [filterQueryParams]);

	const crumbs = useMemo<Crumb[]>(() => {
		const $crumbs: Crumb[] = [];
		$crumbs.push({
			id: ROOTS.ENTRY_POINT,
			label: t('modal.roots.rootsList', 'Files'),
			click: (event: React.SyntheticEvent | KeyboardEvent) => {
				setFilterQueryParam({});
				navigateTo('', event);
			}
		});
		if (!isEmpty(filterQueryParams)) {
			const { sharedWithMe } = filterQueryParams;
			if (sharedWithMe) {
				$crumbs.push({
					id: 'sharedWithMe',
					label: t('modal.roots.sharedWitMe', 'Shared with me'),
					click: (event: React.SyntheticEvent | KeyboardEvent) => {
						setFilterQueryParam(FILTER_PARAMS.sharedWithMe);
						setActiveNode(
							{
								id: ROOTS.SHARED_WITH_ME,
								name: t('modal.roots.sharedWitMe', 'Shared with me'),
								type: NodeType.Root
							},
							event
						);
					}
				});
			}
		}
		// remove click action from last crumb
		if ($crumbs.length > 0) {
			delete $crumbs[$crumbs.length - 1].click;
		}
		return $crumbs;
	}, [filterQueryParams, navigateTo, setActiveNode, t]);

	const nodes = useMemo(() => {
		if (!isEmpty(filterQueryParams) && findNodesData?.findNodes) {
			return reduce(
				findNodesData?.findNodes.nodes,
				(result: NodeListItemType[], node) => {
					if (node) {
						result.push({
							...node,
							disabled: checkDisabled(node),
							selectable: checkSelectable(node)
						});
					}
					return result;
				},
				[]
			);
		}
		return undefined;
	}, [checkDisabled, checkSelectable, filterQueryParams, findNodesData?.findNodes]);

	const rootNodes = useMemo<NodeListItemType[]>(() => {
		const roots: Array<
			| RootListItemType
			| MakeOptional<
					Pick<
						NodeListItemType,
						'id' | 'name' | 'type' | '__typename' | 'permissions' | 'disabled' | 'selectable'
					>,
					'permissions'
			  >
		> = [];
		roots.push(
			{
				id: ROOTS.LOCAL_ROOT,
				name: t('modal.roots.filesHome', 'Home'),
				type: NodeType.Root,
				// FIXME: find a way to load permissions for root nodes
				// trick to make local root a valid destination
				__typename: 'Folder',
				permissions: {
					__typename: 'Permissions',
					can_write_file: true,
					can_write_folder: true,
					can_read: true,
					can_add_version: false,
					can_change_link: false,
					can_change_share: false,
					can_delete: false,
					can_read_link: false,
					can_read_share: false,
					can_share: false
				}
			},
			{
				id: ROOTS.SHARED_WITH_ME,
				name: t('modal.roots.sharedWitMe', 'Shared with me'),
				type: NodeType.Root
			}
		);
		if (showTrash) {
			roots.push({
				id: ROOTS.TRASH,
				name: t('modal.roots.trash.trash', 'Trash'),
				type: NodeType.Root
			});
		}

		forEach(roots, (root) => {
			root.disabled = checkDisabled(root);
			root.selectable = checkSelectable(root);
		});

		return roots as NodeListItemType[];
	}, [checkDisabled, checkSelectable, showTrash, t]);

	const rootNavigationHandler = useCallback<typeof navigateTo>(
		(id, event) => {
			switch (id) {
				case ROOTS.LOCAL_ROOT:
					setFilterQueryParam({});
					navigateTo(id, event);
					break;
				case ROOTS.SHARED_WITH_ME:
					setFilterQueryParam(FILTER_PARAMS.sharedWithMe);
					break;
				default:
					break;
			}
		},
		[navigateTo]
	);

	return (
		<ModalContainer
			mainAlignment="flex-start"
			crossAlignment="flex-start"
			data-testid="modal-list-roots"
			maxHeight="100%"
			minHeight={cssCalcBuilder(BREADCRUMB_ROW_HEIGHT, ['+', LIST_ITEM_HEIGHT_COMPACT])}
		>
			<OverFlowHiddenRow
				width="fill"
				wrap="nowrap"
				height={BREADCRUMB_ROW_HEIGHT}
				mainAlignment="flex-start"
				flexShrink={0}
				data-testid="modal-listHeader-roots"
			>
				{crumbs && <InteractiveBreadcrumbs crumbs={crumbs} />}
				{loading && (
					<Row mainAlignment="flex-end" wrap="nowrap" flexGrow={1}>
						<LoadingIcon icon="Refresh" iconColor="primary" type="ghost" />
					</Row>
				)}
			</OverFlowHiddenRow>
			<Container mainAlignment="flex-start" minHeight="0" maxHeight="100%">
				{nodes &&
					(nodes.length > 0 ? (
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
									message={t('empty.filter.hint', "It looks like there's nothing here.")}
								/>
							</ScrollContainer>
						)
					))}
				{!loading &&
					!nodes &&
					rootNodes &&
					(rootNodes.length > 0 ? (
						<ListContent
							nodes={rootNodes}
							compact
							navigateTo={rootNavigationHandler}
							activeNodes={activeNodes}
							setActiveNode={setActiveNode}
							ref={listRef}
						/>
					) : (
						<ScrollContainer>
							<EmptyFolder
								message={t('empty.filter.hint', "It looks like there's nothing here.")}
							/>
						</ScrollContainer>
					))}
			</Container>
		</ModalContainer>
	);
};
