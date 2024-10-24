/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Container, Row } from '@zextras/carbonio-design-system';
import { forEach, isEmpty } from 'lodash';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { CompactListContent } from './CompactListContent';
import { EmptyFolder } from './EmptyFolder';
import { LoadingIcon } from './LoadingIcon';
import { ScrollContainer } from './ScrollContainer';
import { OverFlowHiddenRow } from './StyledComponents';
import {
	BREADCRUMB_ROW_HEIGHT,
	FILTER_PARAMS,
	LIST_ITEM_HEIGHT_COMPACT,
	NODES_SORT_DEFAULT,
	ROOTS
} from '../../constants';
import { useFindNodesQuery } from '../../hooks/graphql/queries/useFindNodesQuery';
import { Crumb, Node } from '../../types/common';
import { NodeType } from '../../types/graphql/types';
import { OneOrMany } from '../../types/utils';
import { cssCalcBuilder } from '../../utils/utils';
import { InteractiveBreadcrumbs } from '../InteractiveBreadcrumbs';

type NodeItem = Node<'id' | 'name' | 'type' | 'rootId' | 'permissions', 'mime_type'> & {
	disabled?: boolean;
	selectable?: boolean;
};

type RootItem = {
	__typename?: never;
	id: string;
	name: string;
	type: NodeType.Root;
	disabled?: boolean;
	selectable?: boolean;
};

interface RootsListProps {
	activeNodes: OneOrMany<string> | undefined;
	setActiveNode: (node: NodeItem | RootItem, event: React.SyntheticEvent | Event) => void;
	navigateTo: (id: string, event?: React.SyntheticEvent | Event) => void;
	showTrash?: boolean;
	checkDisabled: (node: NodeItem | RootItem) => boolean;
	checkSelectable: (node: NodeItem | RootItem) => boolean;
}

const ModalContainer = styled(Container)`
	flex: 1 1 auto;
`;

type FilterQueryParams = Pick<
	Parameters<typeof useFindNodesQuery>[0],
	'flagged' | 'sharedWithMe' | 'folderId' | 'cascade' | 'directShare'
>;

export const ModalRootsList = ({
	activeNodes,
	setActiveNode,
	navigateTo,
	showTrash = false,
	checkDisabled,
	checkSelectable
}: RootsListProps): React.JSX.Element => {
	const [t] = useTranslation();
	const [filterQueryParams, setFilterQueryParams] = useState<FilterQueryParams>({});
	const {
		data: findNodesData,
		loading,
		loadMore,
		hasMore
	} = useFindNodesQuery({ ...filterQueryParams, sort: NODES_SORT_DEFAULT });

	const listRef = useRef<HTMLDivElement | null>(null);

	useLayoutEffect(() => {
		// scroll list container to top when folderId changes
		listRef.current?.scrollTo(0, 0);
	}, [filterQueryParams]);

	const crumbs = useMemo<Crumb[]>(() => {
		const $crumbs: Crumb[] = [];
		$crumbs.push({
			id: ROOTS.ENTRY_POINT,
			label: t('modal.roots.rootsList', 'Files'),
			onClick: (event: React.SyntheticEvent | KeyboardEvent) => {
				setFilterQueryParams({});
				navigateTo('', event);
			}
		});
		if (!isEmpty(filterQueryParams)) {
			const { sharedWithMe } = filterQueryParams;
			if (sharedWithMe) {
				const sharedWithMeLabel = t('modal.roots.sharedWitMe', 'Shared with me');
				$crumbs.push({
					id: 'sharedWithMe',
					label: sharedWithMeLabel,
					onClick: (event: React.SyntheticEvent | KeyboardEvent) => {
						setFilterQueryParams(FILTER_PARAMS.sharedWithMe);
						setActiveNode(
							{
								id: ROOTS.SHARED_WITH_ME,
								name: sharedWithMeLabel,
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
			delete $crumbs[$crumbs.length - 1].onClick;
		}
		return $crumbs;
	}, [filterQueryParams, navigateTo, setActiveNode, t]);

	const nodes = useMemo(() => {
		if (!isEmpty(filterQueryParams) && findNodesData?.findNodes) {
			return findNodesData?.findNodes.nodes.reduce<NodeItem[]>((result, node) => {
				if (node) {
					result.push({
						...node,
						disabled: checkDisabled(node),
						selectable: checkSelectable(node)
					});
				}
				return result;
			}, []);
		}
		return undefined;
	}, [checkDisabled, checkSelectable, filterQueryParams, findNodesData?.findNodes]);

	const rootNodes = useMemo<(NodeItem | RootItem)[]>(() => {
		const roots: (NodeItem | RootItem)[] = [];
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
				},
				rootId: null
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

		return roots;
	}, [checkDisabled, checkSelectable, showTrash, t]);

	const rootNavigationHandler = useCallback<typeof navigateTo>(
		(id, event) => {
			switch (id) {
				case ROOTS.LOCAL_ROOT:
					setFilterQueryParams({});
					navigateTo(id, event);
					break;
				case ROOTS.SHARED_WITH_ME:
					setFilterQueryParams(FILTER_PARAMS.sharedWithMe);
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
			data-testid="modal-list"
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
				{loading && (
					<Row mainAlignment="flex-end" wrap="nowrap" flexGrow={1}>
						<LoadingIcon icon="Refresh" color="primary" />
					</Row>
				)}
			</OverFlowHiddenRow>
			<Container mainAlignment="flex-start" minHeight="0" maxHeight="100%">
				{nodes &&
					(nodes.length > 0 ? (
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
									message={t('empty.filter.hint', "It looks like there's nothing here.")}
								/>
							</ScrollContainer>
						)
					))}
				{!loading &&
					!nodes &&
					rootNodes &&
					(rootNodes.length > 0 ? (
						<CompactListContent
							nodes={rootNodes}
							navigateTo={rootNavigationHandler}
							activeNodes={activeNodes}
							setActiveNode={setActiveNode}
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
