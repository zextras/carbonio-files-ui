/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { List } from '@zextras/carbonio-design-system';
import { map } from 'lodash';

import { CompactNodeListItem, CompactNodeListItemProps } from './CompactNodeListItem';
import { ROOTS } from '../../constants';
import { File, Folder, Node as GQLNode } from '../../types/graphql/types';
import { OneOrMany } from '../../types/utils';

type NodeItem = Pick<GQLNode, 'id' | 'name' | 'type'> &
	(
		| Pick<File, '__typename' | 'mime_type' | 'rootId'>
		| Pick<Folder, '__typename' | 'rootId'>
		| { __typename?: never; rootId?: never }
	) & {
		disabled?: boolean;
		selectable?: boolean;
	};

export interface CompactListContentProps<TNode extends NodeItem = NodeItem> {
	nodes: TNode[];
	activeNodes: OneOrMany<string> | undefined;
	setActiveNode: CompactNodeListItemProps<TNode>['setActive'];
	navigateTo: CompactNodeListItemProps<TNode>['navigateTo'];
	hasMore?: boolean;
	loadMore?: () => void;
}

export const CompactListContent = <TNode extends NodeItem = NodeItem>({
	nodes,
	activeNodes,
	setActiveNode,
	navigateTo,
	hasMore = false,
	loadMore = (): void => undefined
}: CompactListContentProps<TNode>): React.JSX.Element => {
	const intersectionObserverInitOptions = useMemo(() => ({ threshold: 0.5 }), []);

	const items = useMemo(
		() =>
			map(nodes, (node) => (
				<CompactNodeListItem
					key={node.id}
					node={node}
					isActive={
						activeNodes === node.id ||
						(activeNodes instanceof Array && activeNodes.includes(node.id))
					}
					setActive={setActiveNode}
					navigateTo={navigateTo}
					disabled={node.disabled}
					selectable={node.selectable}
					trashed={node.rootId === ROOTS.TRASH}
				/>
			)),
		[activeNodes, navigateTo, nodes, setActiveNode]
	);

	return (
		<List
			maxHeight={'100%'}
			height={'auto'}
			data-testid="main-list"
			background={'gray6'}
			onListBottom={hasMore ? loadMore : undefined}
			intersectionObserverInitOptions={intersectionObserverInitOptions}
		>
			{items}
		</List>
	);
};
