/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useMemo } from 'react';

import { List } from '@zextras/carbonio-design-system';
import { map } from 'lodash';

import { CompactNodeListItem } from './CompactNodeListItem';
import { ROOTS } from '../../constants';
import { NodeListItemType } from '../../types/common';
import { OneOrMany } from '../../types/utils';

interface ListContentProps {
	nodes: NodeListItemType[];
	activeNodes?: OneOrMany<string>;
	setActiveNode?: (node: NodeListItemType, event: React.SyntheticEvent) => void;
	navigateTo?: (id: string, event?: React.SyntheticEvent | Event) => void;
	hasMore?: boolean;
	loadMore?: () => void;
}

export const CompactListContent = ({
	nodes,
	activeNodes,
	setActiveNode,
	navigateTo,
	hasMore = false,
	loadMore = (): void => undefined
}: ListContentProps): React.JSX.Element => {
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
