/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useContext } from 'react';

import { Container, ContainerProps, useIsVisible } from '@zextras/carbonio-design-system';

import { ContainerCell } from './NodeGridItemUI';
import { GRID_ITEM_MIN_HEIGHT, LIST_ITEM_HEIGHT, VIEW_MODE } from '../../constants';
import { ListContext } from '../../contexts';
import { NodeType } from '../../types/graphql/types';

const NodeListItemPlaceholder = ({ type }: { type: NodeType }): React.JSX.Element => {
	const { viewMode } = useContext(ListContext);

	return viewMode === VIEW_MODE.list ? (
		<Container height={LIST_ITEM_HEIGHT} />
	) : (
		<ContainerCell $showPreview={type !== NodeType.Folder} minHeight={GRID_ITEM_MIN_HEIGHT} />
	);
};

interface VirtualizedNodeListItemProps extends ContainerProps {
	listRef: React.RefObject<HTMLDivElement>;
	type: NodeType;
}

export const VirtualizedNodeListItem = ({
	listRef,
	children,
	type,
	...props
}: VirtualizedNodeListItemProps): React.JSX.Element => {
	const [isVisible, itemRef] = useIsVisible<HTMLDivElement>(listRef);

	return (
		<Container ref={itemRef} height={'auto'} width={'auto'} {...props}>
			{isVisible ? children : <NodeListItemPlaceholder type={type} />}
		</Container>
	);
};
