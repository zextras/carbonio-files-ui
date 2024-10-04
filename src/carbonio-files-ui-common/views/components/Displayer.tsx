/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useContext, useEffect, useMemo } from 'react';

import { Container } from '@zextras/carbonio-design-system';

import { DisplayerNode } from './DisplayerNode';
import { EmptyDisplayer } from './EmptyDisplayer';
import { useActiveNode } from '../../../hooks/useActiveNode';
import { TIMERS } from '../../constants';
import { ListContext } from '../../contexts';
import { useGetNodeQuery } from '../../hooks/graphql/queries/useGetNodeQuery';
import { scrollToNodeItem } from '../../utils/utils';

export interface DisplayerProps {
	translationKey: string;
	icons?: string[];
}

export const Displayer = ({ translationKey, icons = [] }: DisplayerProps): React.JSX.Element => {
	const { viewMode } = useContext(ListContext);
	const { activeNodeId } = useActiveNode();
	const {
		data: nodeData,
		loading,
		loadMore,
		hasMore
	} = useGetNodeQuery(activeNodeId, undefined, { returnPartialData: true });

	const node = useMemo(() => nodeData?.getNode ?? null, [nodeData]);

	useEffect(() => {
		function scrollToItemIfNotVisible(element: HTMLElement | null, nodeId: string): void {
			const main = document.querySelector<HTMLElement>(`[data-testid="main-${viewMode}"]`);
			if (element && main) {
				const { top: itemTop, bottom: itemBottom } = element.getBoundingClientRect();
				const { bottom: mainBottom, top: mainTop } = main.getBoundingClientRect();
				if (itemTop > mainBottom || itemBottom <= mainTop) {
					scrollToNodeItem(nodeId);
				} else if (itemTop > mainTop && itemBottom > mainBottom) {
					scrollToNodeItem(nodeId, 'end');
				}
			}
		}
		if (activeNodeId) {
			const element = document.getElementById(activeNodeId);
			if (element) {
				scrollToItemIfNotVisible(element, activeNodeId);
			} else {
				setTimeout(() => {
					scrollToItemIfNotVisible(document.getElementById(activeNodeId), activeNodeId);
				}, TIMERS.DELAY_WAIT_RENDER_AND_PRAY);
			}
		}
	}, [activeNodeId, viewMode]);

	return (
		<Container
			orientation="vertical"
			mainAlignment="flex-start"
			crossAlignment="flex-start"
			data-testid="displayer"
		>
			{node ? (
				<DisplayerNode node={node} loading={loading} loadMore={loadMore} hasMore={hasMore} />
			) : (
				<EmptyDisplayer icons={icons} translationKey={translationKey} />
			)}
		</Container>
	);
};
